import { AIError, toAIError } from "./errors";
import type { GenerateResult } from "./types";

/**
 * ── The callback contract ─────────────────────────────────────────────────
 *
 * Every generation, on every provider, resolves to exactly one terminal
 * outcome. The gate below is the only thing allowed to emit callbacks, so the
 * guarantees hold no matter which adapter or code path produced the outcome:
 *
 *   1. `onStart` fires at most once, before any other callback.
 *   2. Exactly one of `onSuccess` | `onError` | `onCancel` ever fires.
 *   3. `onSettled` fires exactly once, last, iff a terminal callback fired.
 *   4. After cancellation nothing fires — including in-flight `onToken`.
 *   5. `onToken` never fires after a terminal callback.
 *   6. A throw inside any callback is contained; it can neither abort the
 *      request nor prevent the remaining callbacks from running.
 *
 * Before this existed, the providers each did their own thing: a late-resolving
 * request could still call back after the user had navigated away, a timeout
 * surfaced as a generic Error indistinguishable from a real failure, and the
 * fallback path could report success for the primary provider's model.
 */

export type TerminalOutcome =
  | { status: "success"; result: GenerateResult }
  | { status: "error"; error: AIError }
  | { status: "cancelled"; error: AIError };

export interface GenerateCallbacks {
  /** Fired once when the request is dispatched. */
  onStart?: () => void;
  /** Streaming only: one call per delta, in order. Never after a terminal. */
  onToken?: (delta: string, accumulated: string) => void;
  onSuccess?: (result: GenerateResult) => void;
  onError?: (error: AIError) => void;
  /** Fired instead of onError when the caller aborted. */
  onCancel?: (error: AIError) => void;
  /** Always last, exactly once. */
  onSettled?: (outcome: TerminalOutcome) => void;
}

/** Runs a callback without letting its failure escape into the request flow. */
function safely(name: string, fn: (() => void) | undefined): void {
  if (!fn) return;
  try {
    fn();
  } catch (err) {
    console.error(`[AI] callback "${name}" threw; ignoring.`, err);
  }
}

/**
 * Enforces the contract above for a single generation.
 *
 * Construct one per request, funnel every outcome through it, and the
 * guarantees are structural rather than something each caller must remember.
 */
export class CallbackGate {
  private readonly callbacks: GenerateCallbacks;
  private started = false;
  private settled = false;
  private accumulated = "";

  constructor(callbacks: GenerateCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /** True once a terminal callback has fired. */
  get isSettled(): boolean {
    return this.settled;
  }

  start(): void {
    if (this.started || this.settled) return;
    this.started = true;
    safely("onStart", this.callbacks.onStart);
  }

  /** Ignored after settling, which is what keeps rule 4 and 5 true. */
  token(delta: string): void {
    if (this.settled || delta === "") return;
    this.accumulated += delta;
    const accumulated = this.accumulated;
    safely("onToken", () => this.callbacks.onToken?.(delta, accumulated));
  }

  /** Text streamed so far — used to build the result when a stream ends. */
  get streamedText(): string {
    return this.accumulated;
  }

  succeed(result: GenerateResult): TerminalOutcome {
    const outcome: TerminalOutcome = { status: "success", result };
    if (this.settle()) {
      safely("onSuccess", () => this.callbacks.onSuccess?.(result));
      this.finish(outcome);
    }
    return outcome;
  }

  /**
   * Terminates with a failure. Aborts are routed to `onCancel` rather than
   * `onError` so callers can distinguish "the user moved on" from "it broke".
   */
  fail(err: unknown, context?: { provider?: string; model?: string }): TerminalOutcome {
    const error = toAIError(err, context ?? {});
    const status = error.code === "cancelled" ? "cancelled" : "error";
    const outcome = { status, error } as TerminalOutcome;
    if (this.settle()) {
      if (status === "cancelled") safely("onCancel", () => this.callbacks.onCancel?.(error));
      else safely("onError", () => this.callbacks.onError?.(error));
      this.finish(outcome);
    }
    return outcome;
  }

  /** Marks settled and reports whether this call was the one that won. */
  private settle(): boolean {
    if (this.settled) return false;
    this.settled = true;
    return true;
  }

  private finish(outcome: TerminalOutcome): void {
    safely("onSettled", () => this.callbacks.onSettled?.(outcome));
  }
}

/**
 * Races `work` against a deadline and the caller's abort signal, returning a
 * correctly-classified `AIError` for whichever fires first.
 *
 * The provider SDKs are also handed the signal so the socket really closes;
 * this is the backstop for an SDK that ignores it or hangs before dispatch.
 */
export async function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  { timeoutMs, signal, provider, model }: {
    timeoutMs: number;
    signal?: AbortSignal;
    provider?: string;
    model?: string;
  }
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new AIError({ code: "cancelled", message: "Request was cancelled.", provider, model });
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await work(controller.signal);
  } catch (err) {
    // A timeout aborts the same controller the caller would, so the SDK error
    // is indistinguishable at this point — `timedOut` is the discriminator.
    if (timedOut) {
      throw new AIError({
        code: "timeout",
        message: `${provider ?? "Provider"} did not respond within ${timeoutMs}ms.`,
        provider,
        model,
        cause: err,
      });
    }
    if (signal?.aborted) {
      throw new AIError({
        code: "cancelled",
        message: "Request was cancelled.",
        provider,
        model,
        cause: err,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
