import { CallbackGate, withDeadline } from "./callbacks";
import type { GenerateCallbacks, TerminalOutcome } from "./callbacks";
import { AIError, toAIError } from "./errors";
import { DEFAULT_MODEL_SETTINGS, sanitizeModelSettings } from "./models";
import { geminiClient } from "./providers/gemini";
import { groqClient } from "./providers/groq";
import { DEFAULT_TIMEOUT_MS } from "./types";
import type {
  AIProvider,
  AIProviderClient,
  GenerateOptions,
  GenerateResult,
  ProviderRequest,
} from "./types";

const CLIENTS: Record<AIProvider, AIProviderClient> = {
  gemini: geminiClient,
  groq: groqClient,
};

type ClientMap = Record<AIProvider, AIProviderClient>;

/**
 * Test seam: run the orchestrator against substitute providers so the
 * fallback/cancellation/streaming behaviour can be pinned down offline.
 * Not part of the public API.
 * @internal
 */
export function __generateToOutcomeWith(
  clients: ClientMap,
  options: GenerateOptions,
  callbacks: GenerateCallbacks = {}
): Promise<TerminalOutcome> {
  return runToOutcome(options, new CallbackGate(callbacks), clients);
}

interface Attempt {
  client: AIProviderClient;
  model: string;
}

/**
 * Codes worth one immediate retry on the *same* model before moving on.
 *
 * Gemini's shared-capacity models return 503 "experiencing high demand"
 * sporadically — measured at roughly 1 in 3 calls on the 3.x flash tier — and
 * a single retry clears most of them without the latency of a provider
 * switch. Quota (429) and auth are excluded: they will not clear in a second.
 */
const RETRY_SAME_MODEL: ReadonlySet<string> = new Set(["server", "network"]);
const SAME_MODEL_RETRIES = 1;
const RETRY_BACKOFF_MS = 400;

/** Resolves settings into the ordered list of attempts to make. */
function planAttempts(options: GenerateOptions, CLIENTS: ClientMap): Attempt[] {
  const settings = sanitizeModelSettings(options.modelSettings ?? DEFAULT_MODEL_SETTINGS);

  if (options.forceProvider) {
    const client = CLIENTS[options.forceProvider];
    if (!client) {
      throw new AIError({
        code: "bad_request",
        message: `Unknown provider "${options.forceProvider}".`,
      });
    }
    // A forced provider is an explicit instruction — never silently substitute.
    return [{ client, model: client.defaultModel }];
  }

  const primary: Attempt = {
    client: CLIENTS[settings.primaryProvider],
    model: settings.primaryModel,
  };

  const sameTarget =
    settings.backupProvider === settings.primaryProvider &&
    settings.backupModel === settings.primaryModel;

  if (!settings.enableBackup || sameTarget) return [primary];

  return [primary, { client: CLIENTS[settings.backupProvider], model: settings.backupModel }];
}

/** One attempt against one model, with the deadline and signal applied. */
async function runAttempt(
  { client, model }: Attempt,
  options: GenerateOptions,
  gate: CallbackGate,
  wantStream: boolean
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return withDeadline(
    async (signal) => {
      const req: ProviderRequest = {
        system: options.system,
        prompt: options.prompt,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        model,
        signal,
      };

      if (wantStream && client.generateStream) {
        let text = "";
        for await (const delta of client.generateStream(req)) {
          // Stop the moment the caller walks away, mid-stream.
          if (signal.aborted) {
            throw new AIError({
              code: "cancelled",
              message: "Request was cancelled.",
              provider: client.name,
              model,
            });
          }
          text += delta;
          gate.token(delta);
        }
        return text;
      }

      const text = await client.generate(req);
      // Non-streaming still emits one delta so `onToken` consumers work the
      // same way regardless of whether the model supports streaming.
      if (wantStream) gate.token(text);
      return text;
    },
    { timeoutMs, signal: options.signal, provider: client.name, model }
  );
}

/**
 * Generate text using the configured default (primary) provider/model, falling
 * back to the configured backup when the primary fails with a retryable error.
 *
 * Resolves with the text, or throws an {@link AIError}. When `callbacks` are
 * supplied they follow the contract documented in `callbacks.ts`: exactly one
 * of `onSuccess` / `onError` / `onCancel`, then `onSettled`, and nothing at all
 * after cancellation.
 */
export async function generate(
  options: GenerateOptions,
  callbacks: GenerateCallbacks = {}
): Promise<GenerateResult> {
  const gate = new CallbackGate(callbacks);
  const outcome = await runToOutcome(options, gate);
  if (outcome.status === "success") return outcome.result;
  throw outcome.error;
}

/**
 * Non-throwing variant. Useful where a caller wants to branch on the outcome
 * rather than wrap every call in try/catch — the UI hook uses this.
 */
export async function generateToOutcome(
  options: GenerateOptions,
  callbacks: GenerateCallbacks = {}
): Promise<TerminalOutcome> {
  return runToOutcome(options, new CallbackGate(callbacks));
}

/**
 * One model, with a bounded same-model retry for transient provider errors.
 *
 * Retries only apply before any output has been emitted: re-running a stream
 * that already produced tokens would duplicate them for the caller.
 */
async function attemptWithRetry(
  attempt: Attempt,
  options: GenerateOptions,
  gate: CallbackGate,
  wantStream: boolean
): Promise<string> {
  for (let tries = 0; ; tries++) {
    try {
      return await runAttempt(attempt, options, gate, wantStream);
    } catch (err) {
      const error = toAIError(err, { provider: attempt.client.name, model: attempt.model });
      const canRetry =
        tries < SAME_MODEL_RETRIES &&
        RETRY_SAME_MODEL.has(error.code) &&
        gate.streamedText === "" &&
        !options.signal?.aborted;

      if (!canRetry) throw error;

      console.warn(
        `[AI] ${attempt.client.name}/${attempt.model} returned ${error.code}; retrying once.`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    }
  }
}

async function runToOutcome(
  options: GenerateOptions,
  gate: CallbackGate,
  clients: ClientMap = CLIENTS
): Promise<TerminalOutcome> {
  let attempts: Attempt[];
  try {
    attempts = planAttempts(options, clients);
  } catch (err) {
    // Planning failed (bad provider) — still a normal terminal outcome.
    gate.start();
    return gate.fail(err);
  }

  const wantStream = options.stream === true;
  gate.start();

  // Pre-flight: an already-aborted signal must never dispatch a request.
  if (options.signal?.aborted) {
    return gate.fail(
      new AIError({ code: "cancelled", message: "Request was cancelled before dispatch." })
    );
  }

  let primaryError: AIError | undefined;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const isLast = i === attempts.length - 1;

    try {
      const text = await attemptWithRetry(attempt, options, gate, wantStream);
      const result: GenerateResult = {
        text,
        provider: attempt.client.name,
        model: attempt.model,
        ...(primaryError
          ? {
              usedFallback: true,
              primaryError: {
                code: primaryError.code,
                message: primaryError.message,
                provider: primaryError.provider as AIProvider,
                model: primaryError.model ?? "",
              },
            }
          : {}),
      };
      return gate.succeed(result);
    } catch (err) {
      const error = toAIError(err, { provider: attempt.client.name, model: attempt.model });

      // Cancellation is the caller's decision — never "recover" from it by
      // firing off another request to the backup.
      if (error.code === "cancelled") return gate.fail(error);

      if (isLast || !error.retryable) {
        return gate.fail(
          primaryError
            ? new AIError({
                code: error.code,
                message:
                  `Both AI providers failed. ${primaryError.provider}/${primaryError.model}: ` +
                  `${primaryError.message} — then ${error.message}`,
                provider: error.provider,
                model: error.model,
                status: error.status,
                cause: error,
              })
            : error
        );
      }

      primaryError = error;
      console.warn(
        `[AI] ${attempt.client.name}/${attempt.model} failed (${error.code}) — ` +
          `falling back to ${attempts[i + 1].client.name}/${attempts[i + 1].model}.`,
        error.message
      );
    }
  }

  /* istanbul ignore next — the loop always returns. */
  return gate.fail(new AIError({ code: "unknown", message: "No providers were attempted." }));
}
