"use client";

import { useCallback } from "react";
import type { ToolId } from "@/types";
import type { GenerateResult } from "@/lib/ai";
import { useUserData } from "@/lib/hooks/useUserData";
const MAX_ENTRIES = 200;

export interface UsageEntry {
  id: string;
  toolId: ToolId;
  provider: GenerateResult["provider"];
  model: string;
  prompt: string;
  text: string;
  createdAt: string;
}

function generateId(): string {
  return `usage_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useUsageLog() {
  const { value: entries, setValue: setEntries, hydrated } =
    useUserData<UsageEntry[]>("usage-log", "usage-log", []);

  const logEntry = useCallback(
    (entry: { toolId: ToolId; prompt: string; result: GenerateResult }) => {
      const newEntry: UsageEntry = {
        id: generateId(),
        toolId: entry.toolId,
        provider: entry.result.provider,
        model: entry.result.model,
        prompt: entry.prompt,
        text: entry.result.text,
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    },
    [setEntries]
  );

  const clearEntry = useCallback((id: string): void => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }, [setEntries]);

  const clearAll = useCallback((): void => {
    setEntries([]);
  }, [setEntries]);

  return { entries, hydrated, logEntry, clearEntry, clearAll };
}
