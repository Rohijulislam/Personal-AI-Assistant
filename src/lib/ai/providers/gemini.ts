import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import { AIError, codeForStatus, isAbortError } from "../errors";
import { resolveMaxTokens } from "../models";
import type { AIProviderClient, ProviderRequest } from "../types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const PROVIDER = "gemini" as const;

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIError({
      code: "auth",
      message: "GEMINI_API_KEY is not set.",
      provider: PROVIDER,
    });
  }
  return new GoogleGenAI({ apiKey });
}

function buildConfig(req: ProviderRequest) {
  const maxOutputTokens = resolveMaxTokens(req.model, req.maxTokens);
  return {
    abortSignal: req.signal,
    ...(req.system ? { systemInstruction: req.system } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
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

  const raw = err as { status?: number; code?: number; message?: unknown } | null;
  const message = typeof raw?.message === "string" ? raw.message : String(err);
  // The SDK surfaces the HTTP status on `status` or `code` depending on path,
  // and otherwise only inside the message ("got status: 404 NOT_FOUND").
  const status =
    raw?.status ??
    raw?.code ??
    (message.match(/\b(\d{3})\b/) ? Number(message.match(/\b(\d{3})\b/)![1]) : undefined);

  let code = codeForStatus(status);
  if (code === "unknown" && /fetch failed|ENOTFOUND|ECONNRESET|socket hang up/i.test(message)) {
    code = "network";
  }
  if (/API[_ ]key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    code = "auth";
  }
  if (/not found|is not supported|NOT_FOUND/i.test(message) && status !== 429) {
    code = "model_not_found";
  }

  return new AIError({
    code,
    message: `Gemini (${model}): ${message}`,
    provider: PROVIDER,
    model,
    status,
    cause: err,
  });
}

/**
 * Turns a 200-OK-but-unusable response into a precise error instead of the
 * old catch-all "empty response".
 */
function textOrThrow(response: GenerateContentResponse, model: string): string {
  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = response.text;

  if (text && text.trim() !== "") return text;

  if (finishReason === "MAX_TOKENS") {
    throw new AIError({
      code: "truncated",
      message:
        `Gemini (${model}) hit its output limit before producing any text — ` +
        `the reasoning budget consumed it. Raise maxTokens or use a non-thinking model.`,
      provider: PROVIDER,
      model,
    });
  }
  if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT" || response.promptFeedback?.blockReason) {
    throw new AIError({
      code: "content_filter",
      message: `Gemini (${model}) blocked this request: ${
        response.promptFeedback?.blockReason ?? finishReason
      }.`,
      provider: PROVIDER,
      model,
    });
  }
  throw new AIError({
    code: "malformed_response",
    message: `Gemini (${model}) returned no usable text${
      finishReason ? ` (finishReason: ${finishReason})` : ""
    }.`,
    provider: PROVIDER,
    model,
  });
}

export const geminiClient: AIProviderClient = {
  name: PROVIDER,
  defaultModel: DEFAULT_MODEL,

  async generate(req: ProviderRequest): Promise<string> {
    const model = req.model || DEFAULT_MODEL;
    try {
      const response = await client().models.generateContent({
        model,
        contents: req.prompt,
        config: buildConfig(req),
      });
      return textOrThrow(response, model);
    } catch (err) {
      throw classify(err, model);
    }
  },

  async *generateStream(req: ProviderRequest): AsyncIterable<string> {
    const model = req.model || DEFAULT_MODEL;
    let stream: AsyncGenerator<GenerateContentResponse>;
    try {
      stream = await client().models.generateContentStream({
        model,
        contents: req.prompt,
        config: buildConfig(req),
      });
    } catch (err) {
      throw classify(err, model);
    }

    let emitted = false;
    let lastFinishReason: string | undefined;
    try {
      for await (const chunk of stream) {
        lastFinishReason = chunk.candidates?.[0]?.finishReason ?? lastFinishReason;
        const delta = chunk.text;
        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    } catch (err) {
      throw classify(err, model);
    }

    if (!emitted) {
      if (lastFinishReason === "MAX_TOKENS") {
        throw new AIError({
          code: "truncated",
          message:
            `Gemini (${model}) hit its output limit before producing any text — ` +
            `the reasoning budget consumed it. Raise maxTokens or use a non-thinking model.`,
          provider: PROVIDER,
          model,
        });
      }
      throw new AIError({
        code: "malformed_response",
        message: `Gemini (${model}) streamed no text${
          lastFinishReason ? ` (finishReason: ${lastFinishReason})` : ""
        }.`,
        provider: PROVIDER,
        model,
      });
    }
  },
};
