"use client";

import { useState, useCallback } from "react";
import type { GenerateOptions, GenerateResult } from "@/lib/ai";
import type { ToolId } from "@/types";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { useModelSettings } from "@/lib/hooks/useModelSettings";

interface UseGenerateState {
  data: GenerateResult | null;
  loading: boolean;
  error: string | null;
}

interface UseGenerateReturn extends UseGenerateState {
  generate: (options: GenerateOptions) => Promise<GenerateResult | null>;
  reset: () => void;
}

export function useGenerate(toolId: ToolId): UseGenerateReturn {
  const [state, setState] = useState<UseGenerateState>({
    data: null,
    loading: false,
    error: null,
  });
  const { logEntry } = useUsageLog();
  const { settings } = useModelSettings();

  const generate = useCallback(async (options: GenerateOptions): Promise<GenerateResult | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelSettings: settings, ...options }),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json?.error ?? `Request failed (${res.status})`;
        setState({ data: null, loading: false, error: message });
        return null;
      }

      setState({ data: json, loading: false, error: null });
      logEntry({ toolId, prompt: options.prompt, result: json as GenerateResult });
      return json as GenerateResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, [toolId, logEntry, settings]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, generate, reset };
}
