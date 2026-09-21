import type { AIProvider, ModelSettings } from "./types";

/**
 * ── Model selection (live-verified 2026-09-21) ───────────────────────────
 *
 * Every model below was chosen by probing the real APIs with this project's
 * keys, not from documentation. `npm run audit:models` lists what the keys
 * serve; `npm run test:live` proves each entry actually answers.
 *
 * Why the previous eight entries were wrong:
 *
 *   gemini-2.0-flash             shut down 2026-06-01 → 404
 *   gemini-2.5-pro               404 "no longer available to new users"
 *   gemini-2.5-flash-lite        404 "no longer available to new users"
 *   moonshotai/kimi-k2-instruct  decommissioned 2025-10-10
 *   llama-3.3-70b-versatile      not served by this key (enterprise-gated)
 *   llama-3.1-8b-instant         not served by this key (enterprise-gated)
 *
 * `llama-3.3-70b-versatile` was the configured *backup*, so the fallback path
 * was dead too: any primary failure surfaced as "Both AI providers failed".
 *
 * Note that a model appearing in the provider's models.list is NOT proof it
 * works — 2.5-pro and 2.5-flash-lite are both listed by the API and both 404
 * on generateContent for this key. Only a real request settles it.
 *
 * Deliberately excluded, with measurements:
 *
 *   gemini-3.8/3.7/3.6-flash   intermittent 503 "high demand"; 3.7 and 3.6
 *                              passed only 2/3 rounds and ran 4–16s. Too
 *                              slow and too flaky for interactive tools.
 *   gemini-3.5-flash           reliable (3/3) but 12–16s per call.
 *   gemini-pro-latest,         429 quota exceeded — this key has no Pro-tier
 *   gemini-3.1-pro-preview     allowance, so no Gemini Pro model is usable.
 *   groq/compound,             deprecated 2026-08-24, DECOMMISSIONED
 *   groq/compound-mini         2026-09-21. Fast and accurate when probed, but
 *                              they stop answering the day this was written.
 *   gemini-3.8-flash           3/3 on short prompts, but 503 "high demand" on
 *                              a realistic one, at 4–14s. Too flaky to ship.
 *   gemma-4-31b-it             2/3, and 29–40s per call.
 *   gemini-3-flash-preview     17–24s per call.
 *   gemini-flash-lite-latest   works (~0.9s), but it is an alias that resolves
 *                              to a model already in the set, so it shares
 *                              that quota and adds no headroom.
 *   allam-2-7b                 400 bad_request for a plain chat completion.
 *
 * `run` prices are USD per 1M tokens; latencies are the median of the probes.
 */

export interface ModelOption {
  id: string;
  label: string;
}

export interface ModelSpec extends ModelOption {
  provider: AIProvider;
  /**
   * Provider lifecycle tier. `preview` models work today but the provider may
   * discontinue them at short notice, so their label says so and they are
   * never the default. Run `npm run audit:models` to catch one disappearing.
   */
  tier: "stable" | "preview";
  /** USD per 1M tokens. */
  price: { input: number; output: number };
  /** Verified against the provider's model listing. */
  contextWindow: number;
  maxOutputTokens: number;
  /**
   * Reasoning models spend output budget on hidden thought tokens before any
   * visible text, so a small `maxTokens` yields an empty completion. When
   * true the adapters add {@link THINKING_HEADROOM} to the caller's budget.
   */
  thinking: boolean;
  supportsStreaming: boolean;
  /** Observed round-trip for a one-word answer, in ms. */
  observedLatencyMs: number;
  /** Why this model is in the set. */
  rationale: string;
}

/**
 * Extra output tokens granted to reasoning models on top of the caller's
 * `maxTokens`, so the visible answer still has room after the hidden thinking.
 *
 * This is the fix for the reported Gemini failures and for Groq's gpt-oss
 * models, which both returned empty completions under a modest budget.
 */
export const THINKING_HEADROOM = 4096;

/**
 * Widens the caller's output budget for reasoning models. Unknown models are
 * assumed to think, since widening is the safe direction.
 */
export function resolveMaxTokens(model: string, requested: number | undefined): number | undefined {
  if (requested === undefined) return undefined;
  const spec = getModelSpec(model);
  return (spec?.thinking ?? true) ? requested + THINKING_HEADROOM : requested;
}

export const MODEL_SPECS: readonly ModelSpec[] = [
  {
    provider: "gemini",
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "stable",
    price: { input: 0.3, output: 2.5 },
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 1200,
    rationale:
      "Fastest reliable Gemini here: 3/3 probes at ~1.2s. The only non-lite Gemini that is neither quota-blocked nor demand-throttled on this key. Default primary.",
  },
  {
    provider: "gemini",
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    tier: "stable",
    price: { input: 0.3, output: 2.5 },
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 1100,
    rationale:
      "Current-generation lite tier and Google's named replacement for the 404'd gemini-2.5-flash-lite. ~1.1s, no 503s observed.",
  },
  {
    provider: "gemini",
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    tier: "stable",
    price: { input: 0.25, output: 1.5 },
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 1800,
    rationale:
      "Cheapest working Gemini ($0.25/$1.50). Kept as a same-provider alternative when the 3.5 lite tier is busy.",
  },
  {
    provider: "groq",
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B (Groq)",
    tier: "stable",
    price: { input: 0.15, output: 0.6 },
    contextWindow: 131_072,
    maxOutputTokens: 65_536,
    // Confirmed by probe: at maxTokens=64 it returned finish_reason "length"
    // with no content — the reasoning trace consumed the whole budget.
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 670,
    rationale:
      "Highest-capability model that is actually reliable on these keys, and the cheapest of the set. Cross-provider backup, so a Gemini-wide outage still gets an answer.",
  },
  {
    provider: "groq",
    id: "qwen/qwen3.8-27b",
    label: "Qwen3.8 27B (Groq · preview)",
    tier: "preview",
    price: { input: 0.8, output: 4.0 },
    contextWindow: 131_042,
    maxOutputTokens: 65_536,
    thinking: false,
    supportsStreaming: true,
    observedLatencyMs: 140,
    rationale:
      "By far the fastest model available to these keys — 3/3 probes at ~0.14s, roughly 4x quicker than the next best, with clean rewrite output. Groq preview tier, but actively maintained: it is Groq's named successor to qwen3.6-27b, not a dead end.",
  },
  {
    provider: "gemini",
    id: "gemma-4-26b-a4b-it",
    label: "Gemma 4 26B (free)",
    tier: "stable",
    price: { input: 0, output: 0 },
    contextWindow: 262_144,
    maxOutputTokens: 32_768,
    // Verified by test: at maxTokens=64 it returns finishReason MAX_TOKENS
    // with no text, so it needs the same output headroom as a thinking model.
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 2350,
    rationale:
      "Free of charge on the Gemini API — no paid tier exists for Gemma. 3/3 probes at a very consistent ~2.3s. Draws on its own free-tier quota pool, so it keeps working after the Gemini Flash daily cap is spent.",
  },
  {
    provider: "groq",
    id: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B (Groq)",
    tier: "stable",
    price: { input: 0.1, output: 0.5 },
    contextWindow: 131_072,
    maxOutputTokens: 65_536,
    thinking: true,
    supportsStreaming: true,
    observedLatencyMs: 560,
    rationale:
      "Fastest of the set at ~0.56s. Last-resort fallback and the right default for short, high-volume rewrites.",
  },
] as const;

export const SUPPORTED_MODEL_IDS: readonly string[] = MODEL_SPECS.map((m) => m.id);

const SPEC_BY_ID = new Map(MODEL_SPECS.map((m) => [m.id, m]));

export function getModelSpec(id: string): ModelSpec | undefined {
  return SPEC_BY_ID.get(id);
}

/** True only for a model we ship *and* that belongs to the given provider. */
export function isSupportedModel(provider: string, id: string): boolean {
  const spec = SPEC_BY_ID.get(id);
  return spec !== undefined && spec.provider === provider;
}

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: "Google Gemini",
  groq: "Groq",
};

/** Selectable models per provider, shown on the Settings page. */
export const PROVIDER_MODELS: Record<AIProvider, ModelOption[]> = {
  gemini: MODEL_SPECS.filter((m) => m.provider === "gemini").map(({ id, label }) => ({ id, label })),
  groq: MODEL_SPECS.filter((m) => m.provider === "groq").map(({ id, label }) => ({ id, label })),
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  primaryProvider: "gemini",
  primaryModel: "gemini-2.5-flash",
  backupProvider: "groq",
  // Was llama-3.3-70b-versatile, which this key cannot reach at all.
  backupModel: "openai/gpt-oss-120b",
  enableBackup: true,
};

/**
 * Coerces whatever the client sent into settings we are willing to execute.
 * Client-supplied settings arrive over HTTP, so an unknown provider previously
 * meant `CLIENTS[provider]` was `undefined` and the route threw a TypeError.
 */
export function sanitizeModelSettings(input: unknown): ModelSettings {
  const d = DEFAULT_MODEL_SETTINGS;
  if (typeof input !== "object" || input === null) return d;
  const raw = input as Partial<Record<keyof ModelSettings, unknown>>;

  const provider = (key: "primaryProvider" | "backupProvider"): AIProvider =>
    raw[key] === "gemini" || raw[key] === "groq" ? raw[key] : d[key];

  const model = (
    key: "primaryModel" | "backupModel",
    p: AIProvider,
    fallback: string
  ): string =>
    typeof raw[key] === "string" && isSupportedModel(p, raw[key]) ? raw[key] : fallback;

  const primaryProvider = provider("primaryProvider");
  const backupProvider = provider("backupProvider");

  // If the provider was defaulted, the paired default model must follow it.
  const primaryFallback =
    primaryProvider === d.primaryProvider ? d.primaryModel : PROVIDER_MODELS[primaryProvider][0].id;
  const backupFallback =
    backupProvider === d.backupProvider ? d.backupModel : PROVIDER_MODELS[backupProvider][0].id;

  return {
    primaryProvider,
    primaryModel: model("primaryModel", primaryProvider, primaryFallback),
    backupProvider,
    backupModel: model("backupModel", backupProvider, backupFallback),
    enableBackup: typeof raw.enableBackup === "boolean" ? raw.enableBackup : d.enableBackup,
  };
}
