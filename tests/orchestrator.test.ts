/**
 * Offline behaviour tests for the generate orchestrator: fallback, forced
 * providers, streaming, timeouts and cancellation — all driven through fake
 * providers so no API key or network is involved.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { __generateToOutcomeWith } from "../src/lib/ai/generate";
import { AIError } from "../src/lib/ai/errors";
import type { AIProvider, AIProviderClient, ModelSettings, ProviderRequest } from "../src/lib/ai/types";

// ── fakes ───────────────────────────────────────────────────────────────────

interface FakeOpts {
  /** Resolve with this text. */
  text?: string;
  /** Reject with this instead. */
  error?: AIError;
  /** Delay before settling, ms. */
  delayMs?: number;
  /** Stream these deltas instead of returning in one shot. */
  deltas?: string[];
  /** Omit generateStream entirely, to model a provider that cannot stream. */
  noStreaming?: boolean;
}

function fakeClient(name: AIProvider, opts: FakeOpts) {
  const calls: string[] = [];

  const settle = async (req: ProviderRequest) => {
    if (opts.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, opts.delayMs);
        req.signal.addEventListener("abort", () => {
          clearTimeout(t);
          const e = new Error("aborted");
          e.name = "AbortError";
          reject(e);
        });
      });
    }
    if (opts.error) throw opts.error;
  };

  const client: AIProviderClient = {
    name,
    defaultModel: `${name}-default`,
    async generate(req) {
      calls.push(`generate:${req.model}`);
      await settle(req);
      return opts.text ?? "ok";
    },
  };

  if (!opts.noStreaming) {
    client.generateStream = async function* (req) {
      calls.push(`stream:${req.model}`);
      await settle(req);
      for (const d of opts.deltas ?? [opts.text ?? "ok"]) {
        yield d;
      }
    };
  }

  return { client, calls };
}

function settings(over: Partial<ModelSettings> = {}): ModelSettings {
  return {
    primaryProvider: "gemini",
    primaryModel: "gemini-2.5-flash",
    backupProvider: "groq",
    backupModel: "openai/gpt-oss-120b",
    enableBackup: true,
    ...over,
  };
}

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

// ── happy path ──────────────────────────────────────────────────────────────

test("primary success returns its own provider and model, no fallback flag", async () => {
  const primary = fakeClient("gemini", { text: "hello" });
  const backup = fakeClient("groq", { text: "should not run" });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "success");
  assert.equal(outcome.status === "success" && outcome.result.text, "hello");
  assert.equal(outcome.status === "success" && outcome.result.model, "gemini-2.5-flash");
  assert.equal(outcome.status === "success" && outcome.result.usedFallback, undefined);
  assert.deepEqual(backup.calls, [], "backup must not be touched on success");
  assert.deepEqual(r.calls, ["start", "success", "settled"]);
});

// ── fallback ────────────────────────────────────────────────────────────────

test("a retryable primary failure falls back and reports the backup's model", async () => {
  const primary = fakeClient("gemini", {
    error: new AIError({ code: "model_not_found", message: "retired", provider: "gemini" }),
  });
  const backup = fakeClient("groq", { text: "from backup" });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  assert.equal(outcome.result.text, "from backup");
  // The old code reported the *primary* model here even when the backup answered.
  assert.equal(outcome.result.provider, "groq");
  assert.equal(outcome.result.model, "openai/gpt-oss-120b");
  assert.equal(outcome.result.usedFallback, true);
  assert.equal(outcome.result.primaryError?.code, "model_not_found");
  assert.equal(outcome.result.primaryError?.model, "gemini-2.5-flash");
  // Success still fires exactly once despite two attempts.
  assert.deepEqual(r.calls, ["start", "success", "settled"]);
});

test("both providers failing yields one error naming both", async () => {
  const primary = fakeClient("gemini", {
    error: new AIError({ code: "rate_limit", message: "quota gone", provider: "gemini" }),
  });
  const backup = fakeClient("groq", {
    error: new AIError({ code: "server", message: "overloaded", provider: "groq" }),
  });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "error");
  if (outcome.status !== "error") return;
  assert.match(outcome.error.message, /quota gone/);
  assert.match(outcome.error.message, /overloaded/);
  assert.deepEqual(r.calls, ["start", "error", "settled"], "error fires once, not per attempt");
});

test("a non-retryable primary failure is not retried on the backup", async () => {
  const primary = fakeClient("gemini", {
    error: new AIError({ code: "content_filter", message: "blocked", provider: "gemini" }),
  });
  const backup = fakeClient("groq", { text: "would have worked" });

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", modelSettings: settings() }
  );

  assert.equal(outcome.status, "error");
  assert.deepEqual(backup.calls, [], "content_filter must not be retried elsewhere");
});

test("enableBackup=false leaves the backup untouched", async () => {
  const primary = fakeClient("gemini", {
    error: new AIError({ code: "server", message: "down", provider: "gemini" }),
  });
  const backup = fakeClient("groq", { text: "unused" });

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", modelSettings: settings({ enableBackup: false }) }
  );

  assert.equal(outcome.status, "error");
  assert.deepEqual(backup.calls, []);
});

test("forceProvider pins the provider and skips the backup", async () => {
  const primary = fakeClient("gemini", { text: "unused" });
  const backup = fakeClient("groq", { text: "forced" });

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", forceProvider: "groq", modelSettings: settings() }
  );

  assert.equal(outcome.status, "success");
  assert.equal(outcome.status === "success" && outcome.result.provider, "groq");
  assert.deepEqual(primary.calls, []);
});

test("identical primary and backup targets are attempted only once", async () => {
  const primary = fakeClient("gemini", {
    error: new AIError({ code: "rate_limit", message: "quota", provider: "gemini" }),
  });
  const backup = fakeClient("groq", { text: "unused" });

  await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    {
      prompt: "p",
      modelSettings: settings({ backupProvider: "gemini", backupModel: "gemini-2.5-flash" }),
    }
  );

  assert.deepEqual(primary.calls, ["generate:gemini-2.5-flash"]);
});

// ── streaming ───────────────────────────────────────────────────────────────

test("streaming emits ordered deltas then a single success", async () => {
  const primary = fakeClient("gemini", { deltas: ["Hel", "lo ", "world"] });
  const backup = fakeClient("groq", {});
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", stream: true, modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status === "success" && outcome.result.text, "Hello world");
  assert.deepEqual(r.calls, ["start", "token:Hel", "token:lo ", "token:world", "success", "settled"]);
});

test("a provider without streaming still drives onToken once", async () => {
  const primary = fakeClient("gemini", { text: "whole answer", noStreaming: true });
  const backup = fakeClient("groq", {});
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", stream: true, modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status === "success" && outcome.result.text, "whole answer");
  assert.deepEqual(r.calls, ["start", "token:whole answer", "success", "settled"]);
});

// ── cancellation & timeouts ─────────────────────────────────────────────────

test("cancelling mid-flight fires onCancel only, and never the backup", async () => {
  const primary = fakeClient("gemini", { delayMs: 500, text: "late" });
  const backup = fakeClient("groq", { text: "must not run" });
  const r = recorder();
  const ac = new AbortController();

  const pending = __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", signal: ac.signal, modelSettings: settings() },
    r.callbacks
  );
  setTimeout(() => ac.abort(), 20);
  const outcome = await pending;

  assert.equal(outcome.status, "cancelled");
  assert.deepEqual(backup.calls, [], "cancellation must not trigger a fallback request");
  assert.deepEqual(r.calls, ["start", "cancel", "settled"]);
  assert.ok(!r.calls.includes("success") && !r.calls.includes("error"));
});

test("an already-aborted signal dispatches nothing at all", async () => {
  const primary = fakeClient("gemini", { text: "x" });
  const backup = fakeClient("groq", { text: "y" });
  const r = recorder();
  const ac = new AbortController();
  ac.abort();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", signal: ac.signal, modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "cancelled");
  assert.deepEqual(primary.calls, []);
  assert.deepEqual(backup.calls, []);
  assert.deepEqual(r.calls, ["start", "cancel", "settled"]);
});

test("a timeout is classified as timeout and does fall back", async () => {
  const primary = fakeClient("gemini", { delayMs: 5000 });
  const backup = fakeClient("groq", { text: "backup saved it" });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", timeoutMs: 30, modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "success");
  assert.equal(outcome.status === "success" && outcome.result.primaryError?.code, "timeout");
  assert.deepEqual(r.calls, ["start", "success", "settled"]);
});

test("a timeout with no backup surfaces as a timeout error", async () => {
  const primary = fakeClient("gemini", { delayMs: 5000 });
  const backup = fakeClient("groq", {});

  const outcome = await __generateToOutcomeWith(
    { gemini: primary.client, groq: backup.client },
    { prompt: "p", timeoutMs: 30, modelSettings: settings({ enableBackup: false }) }
  );

  assert.equal(outcome.status, "error");
  assert.equal(outcome.status === "error" && outcome.error.code, "timeout");
});

test("cancelling mid-stream stops tokens and does not report success", async () => {
  const slowStream: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      return "unused";
    },
    async *generateStream(req) {
      for (const d of ["a", "b", "c", "d"]) {
        await new Promise((r) => setTimeout(r, 15));
        if (req.signal.aborted) {
          const e = new Error("aborted");
          e.name = "AbortError";
          throw e;
        }
        yield d;
      }
    },
  };
  const backup = fakeClient("groq", { text: "must not run" });
  const r = recorder();
  const ac = new AbortController();

  const pending = __generateToOutcomeWith(
    { gemini: slowStream, groq: backup.client },
    { prompt: "p", stream: true, signal: ac.signal, modelSettings: settings() },
    r.callbacks
  );
  setTimeout(() => ac.abort(), 25);
  const outcome = await pending;

  assert.equal(outcome.status, "cancelled");
  assert.deepEqual(backup.calls, []);
  assert.equal(r.calls.filter((c) => c === "settled").length, 1);
  assert.ok(!r.calls.includes("success"));
  // Tokens stop at the abort rather than continuing to the end of the stream.
  assert.ok(r.calls.filter((c) => c.startsWith("token:")).length < 4);
  assert.equal(r.calls.at(-2), "cancel");
});

// ── malformed provider output ───────────────────────────────────────────────

test("a provider throwing a bare Error is still a single, typed failure", async () => {
  const primary: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      throw new Error("something raw");
    },
  };
  const backup = fakeClient("groq", {
    error: new AIError({ code: "server", message: "also down", provider: "groq" }),
  });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: primary, groq: backup.client },
    { prompt: "p", modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "error");
  assert.ok(outcome.status === "error" && outcome.error instanceof AIError);
  assert.deepEqual(r.calls, ["start", "error", "settled"]);
});


// ── transient-error retry ───────────────────────────────────────────────────

test("a transient 503 is retried once on the same model before falling back", async () => {
  let calls = 0;
  const flaky: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      calls++;
      if (calls === 1) {
        throw new AIError({ code: "server", message: "high demand", provider: "gemini" });
      }
      return "second time lucky";
    },
  };
  const backup = fakeClient("groq", { text: "must not be needed" });
  const r = recorder();

  const outcome = await __generateToOutcomeWith(
    { gemini: flaky, groq: backup.client },
    { prompt: "p", modelSettings: settings() },
    r.callbacks
  );

  assert.equal(outcome.status, "success");
  assert.equal(outcome.status === "success" && outcome.result.text, "second time lucky");
  assert.equal(outcome.status === "success" && outcome.result.usedFallback, undefined);
  assert.equal(calls, 2, "expected exactly one retry");
  assert.deepEqual(backup.calls, [], "retry should avoid the fallback entirely");
  assert.deepEqual(r.calls, ["start", "success", "settled"]);
});

test("retries are bounded — a persistently failing model still falls back", async () => {
  let calls = 0;
  const broken: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      calls++;
      throw new AIError({ code: "server", message: "still down", provider: "gemini" });
    },
  };
  const backup = fakeClient("groq", { text: "backup" });

  const outcome = await __generateToOutcomeWith(
    { gemini: broken, groq: backup.client },
    { prompt: "p", modelSettings: settings() }
  );

  assert.equal(outcome.status, "success");
  assert.equal(outcome.status === "success" && outcome.result.usedFallback, true);
  assert.equal(calls, 2, "one attempt plus one retry, then move on");
});

test("rate limits are not retried on the same model", async () => {
  let calls = 0;
  const limited: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      calls++;
      throw new AIError({ code: "rate_limit", message: "quota", provider: "gemini" });
    },
  };
  const backup = fakeClient("groq", { text: "backup" });

  await __generateToOutcomeWith(
    { gemini: limited, groq: backup.client },
    { prompt: "p", modelSettings: settings() }
  );

  assert.equal(calls, 1, "quota will not clear in 400ms — go straight to the backup");
});

test("a retry never replays tokens the caller has already seen", async () => {
  let calls = 0;
  const halfStream: AIProviderClient = {
    name: "gemini",
    defaultModel: "gemini-2.5-flash",
    async generate() {
      return "unused";
    },
    async *generateStream() {
      calls++;
      yield "partial";
      throw new AIError({ code: "server", message: "died mid-stream", provider: "gemini" });
    },
  };
  const backup = fakeClient("groq", { text: "backup text" });
  const tokens: string[] = [];

  await __generateToOutcomeWith(
    { gemini: halfStream, groq: backup.client },
    { prompt: "p", stream: true, modelSettings: settings() },
    { onToken: (d) => void tokens.push(d) }
  );

  assert.equal(calls, 1, "a stream that already emitted must not be retried");
  assert.deepEqual(tokens, ["partial", "backup text"]);
});
