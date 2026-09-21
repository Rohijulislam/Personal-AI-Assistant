import Groq from "groq-sdk";
import { AIError, codeForStatus, isAbortError } from "../errors";
import { resolveMaxTokens } from "../models";
import type { AIProviderClient, ProviderRequest } from "../types";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const PROVIDER = "groq" as const;

function client(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AIError({ code: "auth", message: "GROQ_API_KEY is not set.", provider: PROVIDER });
  }
  // Retries are disabled: the orchestrator owns the deadline, and the SDK's
  // own backoff would silently eat into it.
  return new Groq({ apiKey, maxRetries: 0 });
}

function messages(req: ProviderRequest): Groq.Chat.ChatCompletionMessageParam[] {
  const out: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (req.system) out.push({ role: "system", content: req.system });
  out.push({ role: "user", content: req.prompt });
  return out;
}

function body(req: ProviderRequest) {
  // gpt-oss models emit a reasoning trace that counts against max_tokens, so
  // a tight budget returns finish_reason "length" with no content. Same
  // headroom rule as Gemini's thinking models.
  const maxTokens = resolveMaxTokens(req.model || DEFAULT_MODEL, req.maxTokens);
  return {
    model: req.model || DEFAULT_MODEL,
    messages: messages(req),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
  };
}

/** Translates SDK/transport failures into the shared taxonomy. */
function classify(err: unknown, model: string): AIError {
  if (err instanceof AIError) return err;
  if (isAbortError(err)) {
    return new AIError({
      code: "cancelled",
      message: "Request was cancelled.",
      provider: PROVIDER,
      model,
      cause: err,
    });
  }

  const raw = err as { status?: number; message?: unknown; error?: { code?: unknown } } | null;
  const message = typeof raw?.message === "string" ? raw.message : String(err);
  const status = typeof raw?.status === "number" ? raw.status : undefined;

  let code = codeForStatus(status);
  if (err instanceof Groq.APIConnectionTimeoutError) code = "timeout";
  else if (err instanceof Groq.APIConnectionError) code = "network";
  // A decommissioned model is a 400 `model_decommissioned`, not a 404 — without
  // this it would look like our request was malformed.
  if (raw?.error?.code === "model_decommissioned" || /decommissioned|has been deprecated/i.test(message)) {
    code = "model_not_found";
  }
  if (/does not exist|no such model/i.test(message)) code = "model_not_found";

  return new AIError({
    code,
    message: `Groq (${model}): ${message}`,
    provider: PROVIDER,
    model,
    status,
    cause: err,
  });
}

export const groqClient: AIProviderClient = {
  name: PROVIDER,
  defaultModel: DEFAULT_MODEL,

  async generate(req: ProviderRequest): Promise<string> {
    const model = req.model || DEFAULT_MODEL;
    try {
      const completion = await client().chat.completions.create(
        { ...body(req), stream: false },
        { signal: req.signal }
      );

      const choice = completion.choices[0];
      const text = choice?.message?.content;

      if (!text || text.trim() === "") {
        if (choice?.finish_reason === "length") {
          throw new AIError({
            code: "truncated",
            message: `Groq (${model}) hit its output limit before producing any text. Raise maxTokens.`,
            provider: PROVIDER,
            model,
          });
        }
        throw new AIError({
          code: "malformed_response",
          message: `Groq (${model}) returned no usable text${
            choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason})` : ""
          }.`,
          provider: PROVIDER,
          model,
        });
      }
      return text;
    } catch (err) {
      throw classify(err, model);
    }
  },

  async *generateStream(req: ProviderRequest): AsyncIterable<string> {
    const model = req.model || DEFAULT_MODEL;
    let stream;
    try {
      stream = await client().chat.completions.create(
        { ...body(req), stream: true },
        { signal: req.signal }
      );
    } catch (err) {
      throw classify(err, model);
    }

    let emitted = false;
    let lastFinishReason: string | null | undefined;
    try {
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        lastFinishReason = choice?.finish_reason ?? lastFinishReason;
        const delta = choice?.delta?.content;
        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    } catch (err) {
      throw classify(err, model);
    }

    if (!emitted) {
      throw new AIError({
        code: lastFinishReason === "length" ? "truncated" : "malformed_response",
        message: `Groq (${model}) streamed no text${
          lastFinishReason ? ` (finish_reason: ${lastFinishReason})` : ""
        }.`,
        provider: PROVIDER,
        model,
      });
    }
  },
};
