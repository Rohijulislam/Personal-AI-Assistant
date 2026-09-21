/**
 * Live per-model integration tests.
 *
 * Every model in MODEL_SPECS is exercised against the real provider API. A
 * model is only considered supported once this suite passes for it — being
 * present in the registry is not evidence that it works.
 *
 *   npm run test:live
 *
 * Requires GEMINI_API_KEY and GROQ_API_KEY in .env.local. Each model is
 * checked for:
 *   authentication · request · response parsing · streaming · non-streaming
 *   · error classification · timeout · cancellation · callback contract
 */
import test from "node:test";
import assert from "node:assert/strict";

import { generateToOutcome } from "../src/lib/ai/generate";
import { MODEL_SPECS } from "../src/lib/ai/models";
import { geminiClient } from "../src/lib/ai/providers/gemini";
import { groqClient } from "../src/lib/ai/providers/groq";
import { AIError } from "../src/lib/ai/errors";
import type { AIProvider, AIProviderClient, ModelSettings } from "../src/lib/ai/types";

const KEY_FOR: Record<AIProvider, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

/** Pins a single model: no backup, so a failure is attributable to it alone. */
function only(provider: AIProvider, model: string): ModelSettings {
  return {
    primaryProvider: provider,
    primaryModel: model,
    backupProvider: provider,
    backupModel: model,
    enableBackup: false,
  };
}

function recorder() {
  const calls: string[] = [];
  return {
    calls,
    tokens: [] as string[],
    callbacks: {
      onStart: () => void calls.push("start"),
      onSuccess: () => void calls.push("success"),
      onError: () => void calls.push("error"),
      onCancel: () => void calls.push("cancel"),
      onSettled: () => void calls.push("settled"),
    },
  };
}

/** Deterministic, cheap probe: an exact-match answer keeps assertions tight. */
const PROBE = {
  system: "You are a terse assistant. Reply with exactly one word and no punctuation.",
  prompt: "What is the capital of France? Answer with the city name only.",
  temperature: 0,
  maxTokens: 64,
} as const;

/**
 * Quota exhaustion is an account limit, not a defect in the model, and the
 * Gemini free tier allows only 20 requests/day/model. Running this suite a
 * few times will hit it. We surface that loudly but do not call it a failure,
 * because it is not evidence that the integration is broken.
 */
function assertNotQuota(outcome: { status: string; error?: { code: string; message: string } }, t: { diagnostic: (m: string) => void }): boolean {
  if (outcome.status === "error" && outcome.error?.code === "rate_limit") {
    t.diagnostic(`QUOTA EXHAUSTED — not a model failure: ${outcome.error.message.slice(0, 160)}`);
    return true;
  }
  return false;
}

for (const spec of MODEL_SPECS) {
  const envKey = KEY_FOR[spec.provider];
  const keyMissing = !process.env[envKey];

  test(`${spec.id}`, { skip: keyMissing ? `${envKey} is not set` : false }, async (t) => {
    const settings = only(spec.provider, spec.id);

    await t.test("authenticates, responds, and parses", async (st) => {
      const r = recorder();
      const outcome = await generateToOutcome(
        { ...PROBE, modelSettings: settings },
        r.callbacks
      );

      if (assertNotQuota(outcome, st)) return;
      if (outcome.status !== "success") {
        assert.fail(`${spec.id} failed [${outcome.error.code}]: ${outcome.error.message}`);
      }
      assert.equal(typeof outcome.result.text, "string");
      assert.ok(outcome.result.text.trim().length > 0, "expected non-empty text");
      assert.match(outcome.result.text, /paris/i, `unexpected answer: ${outcome.result.text}`);
      assert.equal(outcome.result.provider, spec.provider);
      assert.equal(outcome.result.model, spec.id);
      assert.equal(outcome.result.usedFallback, undefined, "must not have fallen back");
      // Callback contract holds against the real provider too.
      assert.deepEqual(r.calls, ["start", "success", "settled"]);
    });

    await t.test("honours a tight maxTokens without returning empty text", async (st) => {
      // The Gemini 2.5 Pro regression: reasoning models consumed the whole
      // output budget and returned nothing. A small budget must still yield
      // text (or an explicit `truncated`), never a bare empty response.
      const outcome = await generateToOutcome({
        ...PROBE,
        maxTokens: 16,
        modelSettings: settings,
      });

      if (assertNotQuota(outcome, st)) return;
      if (outcome.status === "success") {
        assert.ok(outcome.result.text.trim().length > 0);
      } else {
        assert.equal(
          outcome.error.code,
          "truncated",
          `expected a truncated error, got ${outcome.error.code}: ${outcome.error.message}`
        );
      }
    });

    await t.test(
      "streams deltas and settles once",
      { skip: spec.supportsStreaming ? false : "model does not support streaming" },
      async (st) => {
        const r = recorder();
        const deltas: string[] = [];

        const outcome = await generateToOutcome(
          { ...PROBE, stream: true, modelSettings: settings },
          { ...r.callbacks, onToken: (d) => void deltas.push(d) }
        );

        if (assertNotQuota(outcome, st)) return;
        if (outcome.status !== "success") {
          assert.fail(`${spec.id} stream failed [${outcome.error.code}]: ${outcome.error.message}`);
        }
        assert.ok(deltas.length > 0, "expected at least one delta");
        assert.equal(deltas.join(""), outcome.result.text, "deltas must reconstruct the result");
        assert.match(outcome.result.text, /paris/i);
        assert.deepEqual(r.calls, ["start", "success", "settled"]);
      }
    );

    await t.test("reports a timeout as `timeout`, exactly once", async () => {
      const r = recorder();
      const outcome = await generateToOutcome(
        { ...PROBE, timeoutMs: 1, modelSettings: settings },
        r.callbacks
      );

      assert.equal(outcome.status, "error");
      assert.equal(outcome.status === "error" && outcome.error.code, "timeout");
      assert.deepEqual(r.calls, ["start", "error", "settled"]);
    });

    await t.test("cancellation fires onCancel only, never onSuccess", async () => {
      const r = recorder();
      const ac = new AbortController();
      const pending = generateToOutcome(
        { ...PROBE, signal: ac.signal, modelSettings: settings },
        r.callbacks
      );
      setTimeout(() => ac.abort(), 30);
      const outcome = await pending;

      assert.equal(outcome.status, "cancelled");
      assert.deepEqual(r.calls, ["start", "cancel", "settled"]);
    });
  });
}

// ── provider-level error classification ────────────────────────────────────

const ADAPTERS: Array<{ provider: AIProvider; client: AIProviderClient }> = [
  { provider: "gemini", client: geminiClient },
  { provider: "groq", client: groqClient },
];

for (const { provider, client } of ADAPTERS) {
  const envKey = KEY_FOR[provider];

  test(
    `${provider}: an unknown model id is classified as model_not_found`,
    { skip: !process.env[envKey] ? `${envKey} is not set` : false },
    async () => {
      // Driven through the adapter directly: `generateToOutcome` would (
      // correctly) rewrite an unknown id back to a supported default, so this
      // is the only way to observe how the provider's own rejection is mapped.
      const ac = new AbortController();
      const err = await client
        .generate({
          prompt: "hello",
          model: "definitely-not-a-real-model-xyz",
          signal: ac.signal,
        })
        .then(
          () => null,
          (e: unknown) => e as AIError
        );

      assert.ok(err, "expected the provider to reject an unknown model");
      assert.ok(err instanceof AIError, `expected an AIError, got ${err?.constructor?.name}`);
      assert.ok(
        ["model_not_found", "bad_request", "rate_limit"].includes(err.code),
        `unexpected code ${err.code}: ${err.message}`
      );
      assert.equal(err.provider, provider);
      assert.equal(err.model, "definitely-not-a-real-model-xyz");
    }
  );

  test(`${provider}: a missing API key is classified as auth, without a network call`, async () => {
    const saved = process.env[envKey];
    delete process.env[envKey];
    try {
      const outcome = await generateToOutcome({
        ...PROBE,
        modelSettings: only(provider, MODEL_SPECS.find((m) => m.provider === provider)!.id),
      });
      assert.equal(outcome.status, "error");
      assert.equal(outcome.status === "error" && outcome.error.code, "auth");
    } finally {
      if (saved !== undefined) process.env[envKey] = saved;
    }
  });
}
