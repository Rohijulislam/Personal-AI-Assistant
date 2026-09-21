import type { AIError } from "./errors";

export type AIProvider = "gemini" | "groq";

/** Default request deadline. Overridable per call via `timeoutMs`. */
export const DEFAULT_TIMEOUT_MS = 60_000;

/** User-configurable default/backup provider + model, persisted in Settings */
export interface ModelSettings {
  primaryProvider: AIProvider;
  primaryModel: string;
  backupProvider: AIProvider;
  backupModel: string;
  /** Whether to fall back to the backup model when the primary one fails */
  enableBackup: boolean;
}

export interface GenerateOptions {
  /** System-level instruction for the model */
  system?: string;
  /** The user prompt / input content */
  prompt: string;
  /** Max output tokens (optional, provider default if omitted) */
  maxTokens?: number;
  /** Temperature 0–1 (optional) */
  temperature?: number;
  /** Force a specific provider instead of auto-selecting, skipping the backup */
  forceProvider?: AIProvider;
  /** Default/backup provider + model to use, from the Settings page */
  modelSettings?: ModelSettings;
  /** Abort the request; resolves as a `cancelled` outcome, not an error */
  signal?: AbortSignal;
  /** Per-request deadline in ms (default {@link DEFAULT_TIMEOUT_MS}) */
  timeoutMs?: number;
  /** Stream deltas through `onToken`. Falls back to a single chunk if unsupported */
  stream?: boolean;
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
  model: string;
  /** True when the primary provider failed and the backup produced this text */
  usedFallback?: boolean;
  /** Why the primary was abandoned — present only when `usedFallback` is true */
  primaryError?: { code: AIError["code"]; message: string; provider: AIProvider; model: string };
}

/** What a provider adapter is handed for one attempt at one model. */
export interface ProviderRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model: string;
  /** Already merged with the deadline — adapters pass this straight to the SDK. */
  signal: AbortSignal;
}

/**
 * Provider adapters are deliberately thin: produce text or throw an `AIError`.
 * Timeouts, cancellation, fallback and callbacks are handled above them so the
 * behaviour cannot drift between providers.
 */
export interface AIProviderClient {
  name: AIProvider;
  /** Used when a caller supplies no model. */
  defaultModel: string;
  generate(req: ProviderRequest): Promise<string>;
  /** Yields text deltas. Adapters that cannot stream should not define this. */
  generateStream?(req: ProviderRequest): AsyncIterable<string>;
}
