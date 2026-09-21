"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AIErrorCode, GenerateOptions, GenerateResult } from "@/lib/ai";
import type { ToolId } from "@/types";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { useModelSettings } from "@/lib/hooks/useModelSettings";

/** Client-side mirror of the server's `AIError`, minus the stack. */
export interface GenerateError {
  message: string;
  code: AIErrorCode;
  provider?: string;
  model?: string;
}

interface UseGenerateState {
  data: GenerateResult | null;
  loading: boolean;
  /** Message only — kept as `string | null` so existing callers still work. */
  error: string | null;
  /** Structured form of the same failure, for callers that want to branch. */
  errorDetail: GenerateError | null;
  /** Text received so far while streaming. Empty when not streaming. */
  streamText: string;
}

export interface UseGenerateCallbacks {
  onSuccess?: (result: GenerateResult) => void;
  onError?: (error: GenerateError) => void;
  onCancel?: () => void;
  onToken?: (delta: string, accumulated: string) => void;
}

interface UseGenerateReturn extends UseGenerateState {
  generate: (
    options: GenerateOptions,
    callbacks?: UseGenerateCallbacks
  ) => Promise<GenerateResult | null>;
  /** Aborts the in-flight request. No success/error callback will follow. */
  cancel: () => void;
  reset: () => void;
}

const IDLE: UseGenerateState = {
  data: null,
  loading: false,
  error: null,
  errorDetail: null,
  streamText: "",
};

/** Strips fields that must not (or cannot) cross the wire. */
function toWireBody(options: GenerateOptions, settings: unknown) {
  const { modelSettings, ...rest } = options;
  delete (rest as { signal?: unknown }).signal;
  return { ...rest, modelSettings: modelSettings ?? settings };
}

function asGenerateError(payload: unknown, fallbackMessage: string): GenerateError {
  const p = (payload ?? {}) as Record<string, unknown>;
  return {
    message: typeof p.error === "string" ? p.error : fallbackMessage,
    code: (typeof p.code === "string" ? p.code : "unknown") as AIErrorCode,
    provider: typeof p.provider === "string" ? p.provider : undefined,
    model: typeof p.model === "string" ? p.model : undefined,
  };
}

export function useGenerate(toolId: ToolId): UseGenerateReturn {
  const [state, setState] = useState<UseGenerateState>(IDLE);
  const { logEntry } = useUsageLog();
  const { settings } = useModelSettings();

  // Monotonic id: only the newest request may write state or fire callbacks,
  // so a slow earlier response can never overwrite a newer one.
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  const generate = useCallback(
    async (
      options: GenerateOptions,
      callbacks: UseGenerateCallbacks = {}
    ): Promise<GenerateResult | null> => {
      // Starting a new request supersedes the old one, in flight or not.
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      const id = ++requestId.current;

      /** True only for the newest request, and only while still mounted. */
      const isCurrent = () => mounted.current && requestId.current === id;

      setState({ ...IDLE, loading: true });

      const finishError = (error: GenerateError): null => {
        if (!isCurrent()) return null;
        setState({ ...IDLE, error: error.message, errorDetail: error });
        callbacks.onError?.(error);
        return null;
      };

      const finishSuccess = (result: GenerateResult): GenerateResult => {
        if (!isCurrent()) return result;
        setState({ ...IDLE, data: result, streamText: result.text });
        logEntry({ toolId, prompt: options.prompt, result });
        callbacks.onSuccess?.(result);
        return result;
      };

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toWireBody(options, settings)),
          signal: ctrl.signal,
        });

        if (options.stream && res.ok && res.body) {
          return await consumeStream(res.body, { isCurrent, callbacks, setState, finishSuccess, finishError });
        }

        // An error page (proxy 502, HTML) is not JSON — don't let the parse
        // failure masquerade as a network error.
        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (!res.ok) {
          return finishError(asGenerateError(payload, `Request failed (${res.status})`));
        }
        if (!payload || typeof (payload as GenerateResult).text !== "string") {
          return finishError({
            message: "The server returned a malformed response.",
            code: "malformed_response",
          });
        }
        return finishSuccess(payload as GenerateResult);
      } catch (err) {
        // An abort is a deliberate act, not a failure: no error state, no
        // error callback, and nothing at all if a newer request took over.
        if (ctrl.signal.aborted) {
          if (isCurrent()) {
            setState(IDLE);
            callbacks.onCancel?.();
          }
          return null;
        }
        return finishError({
          message: err instanceof Error ? err.message : "Network error",
          code: "network",
        });
      } finally {
        if (controller.current === ctrl) controller.current = null;
      }
    },
    [toolId, logEntry, settings]
  );

  const reset = useCallback(() => {
    cancel();
    requestId.current++; // orphan any in-flight response
    setState(IDLE);
  }, [cancel]);

  return { ...state, generate, cancel, reset };
}

/** Reads the SSE frames emitted by the streaming branch of /api/generate. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  ctx: {
    isCurrent: () => boolean;
    callbacks: UseGenerateCallbacks;
    setState: (s: UseGenerateState) => void;
    finishSuccess: (r: GenerateResult) => GenerateResult;
    finishError: (e: GenerateError) => null;
  }
): Promise<GenerateResult | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let settled: GenerateResult | null = null;
  let failure: GenerateError | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!frame.startsWith("data:")) continue;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(frame.slice(5).trim());
        } catch {
          continue; // skip an unparseable frame rather than killing the stream
        }

        if (msg.type === "delta" && typeof msg.text === "string") {
          if (!ctx.isCurrent()) return null;
          accumulated += msg.text;
          ctx.setState({ ...IDLE, loading: true, streamText: accumulated });
          ctx.callbacks.onToken?.(msg.text, accumulated);
        } else if (msg.type === "done") {
          settled = msg.result as GenerateResult;
        } else if (msg.type === "error") {
          failure = asGenerateError(msg, "Streaming failed");
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (failure) return ctx.finishError(failure);
  if (settled) return ctx.finishSuccess(settled);
  // Connection dropped before a terminal frame — surface it rather than
  // leaving the caller stuck on `loading`.
  return ctx.finishError({
    message: "The stream ended before completing.",
    code: "malformed_response",
  });
}
