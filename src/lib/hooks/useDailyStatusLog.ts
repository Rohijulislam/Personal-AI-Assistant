"use client";

import { useState, useEffect, useCallback } from "react";
import type { DailyStatusEntry } from "@/types";
import { formatDateMDY, getDayName, toISODateLocal } from "@/lib/date-utils";
import { extractTodayItems } from "@/lib/daily-status";

const STORAGE_KEY = "daily-status-log";

function loadFromStorage(): DailyStatusEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DailyStatusEntry) : null;
  } catch {
    return null;
  }
}

function saveToStorage(entry: DailyStatusEntry | null): void {
  try {
    if (entry) localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export function useDailyStatusLog() {
  const [lastEntry, setLastEntry] = useState<DailyStatusEntry | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLastEntry(loadFromStorage());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist to localStorage on every change (after hydration)
  useEffect(() => {
    if (hydrated) saveToStorage(lastEntry);
  }, [lastEntry, hydrated]);

  /** Extracts the "today"/"planned" items from raw notes and saves them as the next business day's default "yesterday". */
  const recordTodayItems = useCallback(
    (rawInput: string, today: Date = new Date()) => {
      const items = extractTodayItems(rawInput);
      if (!items) return;
      setLastEntry({
        date: toISODateLocal(today),
        dayName: getDayName(today),
        dateLabel: formatDateMDY(today),
        items,
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );

  return { lastEntry, hydrated, recordTodayItems };
}
