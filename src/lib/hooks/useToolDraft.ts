"use client";

import { useCallback, type SetStateAction } from "react";
import { useUserData } from "@/lib/hooks/useUserData";

/** Keeps unfinished tool input under the signed-in account. */
export function useToolDraft<T>(tool: string, initial: T) {
  const { value, setValue, hydrated } = useUserData<Record<string, T>>(
    "drafts",
    "assistant:drafts",
    {},
  );
  const draft = value[tool] ?? initial;
  const setDraft = useCallback((next: SetStateAction<T>) => {
    setValue((current) => {
      const previous = current[tool] ?? initial;
      const updated = typeof next === "function"
        ? (next as (value: T) => T)(previous)
        : next;
      return { ...current, [tool]: updated };
    });
  }, [initial, setValue, tool]);
  return { draft, setDraft, hydrated };
}
