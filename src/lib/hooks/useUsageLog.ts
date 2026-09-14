"use client";

import { useState, useEffect, useCallback } from "react";
import type { ToolId } from "@/types";
import type { GenerateResult } from "@/lib/ai";

const STORAGE_KEY = "usage-log";
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

function loadFromStorage(): UsageEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageEntry[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: UsageEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export function useUsageLog() {
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage after mount (SSR has no window).
    /* eslint-disable react-hooks/set-state-in-effect */
    setEntries(loadFromStorage());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveToStorage(entries);
    }
  }, [entries, hydrated]);

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
    []
  );

  const clearEntry = useCallback((id: string): void => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback((): void => {
    setEntries([]);
  }, []);

  return { entries, hydrated, logEntry, clearEntry, clearAll };
}
