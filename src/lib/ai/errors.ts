/**
 * A single, provider-agnostic error type.
 *
 * Every provider adapter is responsible for translating its SDK's errors into
 * an `AIError` so that callers (the orchestrator, the route, the UI) can branch
 * on a stable `code` instead of string-matching provider-specific messages.
 */

export type AIErrorCode =
  /** Missing/invalid API key, or the key lacks access to the model. */
  | "auth"
  /** The model id does not exist, was retired, or is not enabled for this key. */
  | "model_not_found"
  /** Request rejected as malformed by the provider (4xx that is our fault). */
  | "bad_request"
  /** Quota or rate limit exhausted. */
  | "rate_limit"
  /** Provider-side 5xx / overloaded. */
  | "server"
  /** Transport failure — DNS, socket, TLS, fetch rejection. */
  | "network"
  /** We gave up waiting (our own deadline, not the provider's). */
  | "timeout"
  /** The caller aborted via `AbortSignal`. */
  | "cancelled"
  /** Provider stopped mid-flight (e.g. output budget consumed by reasoning). */
  | "truncated"
  /** Blocked by the provider's safety filters. */
  | "content_filter"
  /** 200 OK, but the payload had no usable text (or failed to parse). */
  | "malformed_response"
  | "unknown";

/** Codes where trying a *different* provider/model is a reasonable next step. */
const RETRYABLE: ReadonlySet<AIErrorCode> = new Set<AIErrorCode>([
  "auth",
  "model_not_found",
  "rate_limit",
  "server",
  "network",
  "timeout",
  "truncated",
  "malformed_response",
  "unknown",
]);

export interface AIErrorInit {
  code: AIErrorCode;
  message: string;
  provider?: string;
  model?: string;
  /** Provider HTTP status, when there was one. */
  status?: number;
  cause?: unknown;
}

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly provider?: string;
  readonly model?: string;
  readonly status?: number;

  constructor({ code, message, provider, model, status, cause }: AIErrorInit) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AIError";
    this.code = code;
    this.provider = provider;
    this.model = model;
    this.status = status;
  }

  /** True when falling back to another provider/model could plausibly succeed. */
  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }

  /**
   * Returns an error carrying the given provider/model, filling in only what
   * is missing. An adapter that raised a typed error without naming the model
   * would otherwise leave the orchestrator unable to say which attempt failed.
   */
  withContext(context: { provider?: string; model?: string }): AIError {
    if ((this.provider || !context.provider) && (this.model || !context.model)) return this;
    return new AIError({
      code: this.code,
      message: this.message,
      provider: this.provider ?? context.provider,
      model: this.model ?? context.model,
      status: this.status,
      cause: this.cause ?? this,
    });
  }

  /** Serializable shape for API responses — never leaks stack traces or keys. */
  toJSON(): { error: string; code: AIErrorCode; provider?: string; model?: string } {
    return {
      error: this.message,
      code: this.code,
      ...(this.provider ? { provider: this.provider } : {}),
      ...(this.model ? { model: this.model } : {}),
    };
  }
}

/** True for the several shapes an abort can arrive in across runtimes and SDKs. */
export function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { name?: unknown; code?: unknown; message?: unknown };
  return (
    e.name === "AbortError" ||
    e.name === "APIUserAbortError" ||
    e.code === "ABORT_ERR" ||
    (typeof e.message === "string" && /\baborted\b/i.test(e.message))
  );
}

/**
 * Last-resort coercion. Provider adapters should classify their own errors;
 * this only catches what slips through so callers never see a raw `unknown`.
 */
export function toAIError(
  err: unknown,
  context: { provider?: string; model?: string } = {}
): AIError {
  if (err instanceof AIError) return err.withContext(context);
  if (isAbortError(err)) {
    return new AIError({ code: "cancelled", message: "Request was cancelled.", ...context, cause: err });
  }
  const message = err instanceof Error ? err.message : String(err);
  return new AIError({ code: "unknown", message, ...context, cause: err });
}

/** Maps an HTTP status onto the closest error code. */
export function codeForStatus(status: number | undefined): AIErrorCode {
  if (status === undefined) return "unknown";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "model_not_found";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  if (status >= 400) return "bad_request";
  return "unknown";
}
