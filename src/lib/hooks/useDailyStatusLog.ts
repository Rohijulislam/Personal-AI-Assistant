"use client";

import { useCallback } from "react";
import type { DailyStatusEntry } from "@/types";
import { formatDateMDY, getDayName, toISODateLocal } from "@/lib/date-utils";
import { extractTodayItems } from "@/lib/daily-status";
import { useUserData } from "@/lib/hooks/useUserData";

export function useDailyStatusLog() {
  const { value: lastEntry, setValue: setLastEntry, hydrated } =
    useUserData<DailyStatusEntry | null>("daily-status-log", "daily-status-log", null);

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
    [setLastEntry],
  );

  return { lastEntry, hydrated, recordTodayItems };
}
