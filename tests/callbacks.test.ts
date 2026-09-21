/**
 * Contract tests for the unified callback flow.
 *
 * These run offline against a fake provider so the guarantees are pinned down
 * independently of any network or API key. The live model tests live in
 * `models.live.test.ts`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { CallbackGate, withDeadline } from "../src/lib/ai/callbacks";
import { AIError } from "../src/lib/ai/errors";
import {
  sanitizeModelSettings,
  DEFAULT_MODEL_SETTINGS,
  MODEL_SPECS,
  PROVIDER_MODELS,
  getModelSpec,
  resolveMaxTokens,
  THINKING_HEADROOM,
} from "../src/lib/ai/models";
import type { GenerateResult } from "../src/lib/ai/types";

const RESULT: GenerateResult = { text: "hi", provider: "gemini", model: "gemini-2.5-flash" };

/** Records every callback in fire order so ordering can be asserted. */
function recorder() {
  const calls: string[] = [];
  return {
    calls,
    callbacks: {
      onStart: () => void calls.push("start"),
      onToken: (d: string) => void calls.push(`token:${d}`),
      onSuccess: () => void calls.push("success"),
      onError: () => void calls.push("error"),
      onCancel: () => void calls.push("cancel"),
      onSettled: () => void calls.push("settled"),
    },
  };
}

test("success fires start → success → settled, exactly once each", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  gate.start();
  gate.start(); // duplicate starts are ignored
  gate.succeed(RESULT);
  gate.succeed(RESULT); // duplicate terminals are ignored
  assert.deepEqual(r.calls, ["start", "success", "settled"]);
});

test("failure fires onError, never onSuccess, and settles once", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  gate.start();
  gate.fail(new AIError({ code: "server", message: "boom" }));
  gate.succeed(RESULT); // a late success must not overwrite the failure
  assert.deepEqual(r.calls, ["start", "error", "settled"]);
});

test("cancellation routes to onCancel, not onError", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  gate.start();
  const outcome = gate.fail(new AIError({ code: "cancelled", message: "stopped" }));
  assert.equal(outcome.status, "cancelled");
  assert.deepEqual(r.calls, ["start", "cancel", "settled"]);
});

test("an AbortError from any SDK is recognised as cancellation", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  const abort = new Error("The operation was aborted");
  abort.name = "AbortError";
  gate.start();
  assert.equal(gate.fail(abort).status, "cancelled");
  assert.deepEqual(r.calls, ["start", "cancel", "settled"]);
});

test("no callback fires after a terminal — including in-flight tokens", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  gate.start();
  gate.token("a");
  gate.fail(new AIError({ code: "cancelled", message: "stopped" }));
  gate.token("b"); // arrives after the abort — must be dropped
  gate.token("c");
  assert.deepEqual(r.calls, ["start", "token:a", "cancel", "settled"]);
});

test("onToken receives both the delta and the accumulated text, in order", () => {
  const seen: Array<[string, string]> = [];
  const gate = new CallbackGate({ onToken: (d, acc) => void seen.push([d, acc]) });
  gate.start();
  gate.token("He");
  gate.token("llo");
  gate.token(""); // empty deltas are not surfaced
  assert.deepEqual(seen, [
    ["He", "He"],
    ["llo", "Hello"],
  ]);
  assert.equal(gate.streamedText, "Hello");
});

test("a throwing callback cannot break the flow or the later callbacks", () => {
  const calls: string[] = [];
  const gate = new CallbackGate({
    onSuccess: () => {
      calls.push("success");
      throw new Error("consumer blew up");
    },
    onSettled: () => void calls.push("settled"),
  });
  gate.start();
  assert.doesNotThrow(() => gate.succeed(RESULT));
  assert.deepEqual(calls, ["success", "settled"]);
});

test("start() after settling is a no-op", () => {
  const r = recorder();
  const gate = new CallbackGate(r.callbacks);
  gate.fail(new AIError({ code: "server", message: "boom" }));
  gate.start();
  assert.deepEqual(r.calls, ["error", "settled"]);
});

// ── withDeadline ────────────────────────────────────────────────────────────

test("withDeadline resolves normally inside the deadline", async () => {
  const value = await withDeadline(async () => "done", { timeoutMs: 1000 });
  assert.equal(value, "done");
});

test("withDeadline converts an overrun into a timeout AIError", async () => {
  await assert.rejects(
    withDeadline(
      (signal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
      { timeoutMs: 20, provider: "gemini", model: "gemini-2.5-flash" }
    ),
    (err: unknown) => {
      assert.ok(err instanceof AIError);
      assert.equal(err.code, "timeout");
      assert.equal(err.provider, "gemini");
      return true;
    }
  );
});

test("withDeadline reports caller aborts as cancelled, not timeout", async () => {
  const ac = new AbortController();
  const pending = withDeadline(
    (signal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
    { timeoutMs: 5000, signal: ac.signal }
  );
  ac.abort();
  await assert.rejects(pending, (err: unknown) => {
    assert.ok(err instanceof AIError);
    assert.equal(err.code, "cancelled");
    return true;
  });
});

test("withDeadline refuses to dispatch on an already-aborted signal", async () => {
  const ac = new AbortController();
  ac.abort();
  let dispatched = false;
  await assert.rejects(
    withDeadline(
      async () => {
        dispatched = true;
        return "nope";
      },
      { timeoutMs: 1000, signal: ac.signal }
    ),
    (err: unknown) => (err as AIError).code === "cancelled"
  );
  assert.equal(dispatched, false, "work must not run for an aborted signal");
});

test("withDeadline clears its timer so a fast success cannot fire it later", async () => {
  const ac = new AbortController();
  await withDeadline(async () => "fast", { timeoutMs: 30, signal: ac.signal });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(ac.signal.aborted, false);
});

// ── error taxonomy ──────────────────────────────────────────────────────────

test("cancelled and bad_request are never retried on another provider", () => {
  assert.equal(new AIError({ code: "cancelled", message: "" }).retryable, false);
  assert.equal(new AIError({ code: "bad_request", message: "" }).retryable, false);
  assert.equal(new AIError({ code: "content_filter", message: "" }).retryable, false);
});

test("transient and model-level failures are retryable on the backup", () => {
  for (const code of ["auth", "model_not_found", "rate_limit", "server", "network", "timeout", "truncated"] as const) {
    assert.equal(new AIError({ code, message: "" }).retryable, true, code);
  }
});

test("AIError.toJSON never leaks a stack or a cause", () => {
  const json = new AIError({
    code: "auth",
    message: "bad key",
    provider: "gemini",
    model: "gemini-2.5-flash",
    cause: new Error("secret-ish"),
  }).toJSON();
  assert.deepEqual(json, { error: "bad key", code: "auth", provider: "gemini", model: "gemini-2.5-flash" });
});

// ── settings sanitisation ───────────────────────────────────────────────────

test("unknown providers and models fall back to defaults instead of crashing", () => {
  assert.deepEqual(
    sanitizeModelSettings({ primaryProvider: "evil", primaryModel: "../../etc/passwd" }),
    DEFAULT_MODEL_SETTINGS
  );
  assert.deepEqual(sanitizeModelSettings(null), DEFAULT_MODEL_SETTINGS);
  assert.deepEqual(sanitizeModelSettings("nope"), DEFAULT_MODEL_SETTINGS);
});

test("a retired model id is rejected rather than sent to the provider", () => {
  const s = sanitizeModelSettings({
    primaryProvider: "gemini",
    primaryModel: "gemini-2.0-flash", // shut down 2026-06-01
    backupProvider: "groq",
    backupModel: "moonshotai/kimi-k2-instruct", // decommissioned 2025-10-10
    enableBackup: true,
  });
  assert.equal(s.primaryModel, DEFAULT_MODEL_SETTINGS.primaryModel);
  assert.equal(s.backupModel, DEFAULT_MODEL_SETTINGS.backupModel);
});

test("a model belonging to the other provider is not accepted", () => {
  const s = sanitizeModelSettings({
    primaryProvider: "groq",
    primaryModel: "gemini-2.5-flash", // valid id, wrong provider
    backupProvider: "gemini",
    backupModel: "gemini-2.5-flash",
    enableBackup: true,
  });
  assert.equal(s.primaryModel, "openai/gpt-oss-120b");
  assert.equal(s.backupModel, "gemini-2.5-flash");
});

test("every shipped model is reachable through PROVIDER_MODELS", () => {
  for (const spec of MODEL_SPECS) {
    assert.ok(
      PROVIDER_MODELS[spec.provider].some((m) => m.id === spec.id),
      `${spec.id} missing from the Settings dropdown`
    );
  }
  assert.equal(MODEL_SPECS.length, 7);
});

test("a preview model is labelled as such and is never a default", () => {
  for (const spec of MODEL_SPECS.filter((m) => m.tier === "preview")) {
    assert.match(spec.label, /preview/i, `${spec.id} must say "preview" in its label`);
    assert.notEqual(spec.id, DEFAULT_MODEL_SETTINGS.primaryModel, spec.id);
    assert.notEqual(spec.id, DEFAULT_MODEL_SETTINGS.backupModel, spec.id);
  }
});

test("both providers keep at least one model, so fallback can cross providers", () => {
  for (const provider of ["gemini", "groq"] as const) {
    assert.ok(
      MODEL_SPECS.some((m) => m.provider === provider && m.tier === "stable"),
      `${provider} has no stable model`
    );
  }
  assert.notEqual(
    DEFAULT_MODEL_SETTINGS.primaryProvider,
    DEFAULT_MODEL_SETTINGS.backupProvider,
    "the default backup must be on a different provider"
  );
});

test("the retired model ids are gone from the registry", () => {
  const retired = [
    "gemini-2.0-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "moonshotai/kimi-k2-instruct",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ];
  for (const id of retired) {
    assert.equal(getModelSpec(id), undefined, `${id} is still configured`);
  }
});

test("reasoning models get output headroom; the caller's budget is never shrunk", () => {
  for (const spec of MODEL_SPECS) {
    const resolved = resolveMaxTokens(spec.id, 64);
    assert.ok(resolved !== undefined && resolved >= 64, spec.id);
    if (spec.thinking) assert.equal(resolved, 64 + THINKING_HEADROOM, spec.id);
  }
  assert.equal(resolveMaxTokens("gemini-2.5-flash", undefined), undefined);
  // Unknown models are assumed to think — widening is the safe direction.
  assert.equal(resolveMaxTokens("some-future-model", 64), 64 + THINKING_HEADROOM);
});

test("valid settings pass through untouched", () => {
  const input = {
    primaryProvider: "gemini" as const,
    primaryModel: "gemini-3.5-flash-lite",
    backupProvider: "groq" as const,
    backupModel: "openai/gpt-oss-120b",
    enableBackup: false,
  };
  assert.deepEqual(sanitizeModelSettings(input), input);
});
