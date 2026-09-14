"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedInstruction, InstructionCategory } from "@/types";

const STORAGE_KEY = "saved-instructions";

function generateId(): string {
  return `instr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): SavedInstruction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedInstruction[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(instructions: SavedInstruction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions));
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export type InstructionDraft = {
  title: string;
  content: string;
  category: InstructionCategory;
  tags: string[];
  pinned: boolean;
};

export function useSavedInstructions() {
  const [instructions, setInstructions] = useState<SavedInstruction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setInstructions(loadFromStorage());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist to localStorage on every change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveToStorage(instructions);
    }
  }, [instructions, hydrated]);

  const add = useCallback((draft: InstructionDraft): SavedInstruction => {
    const now = new Date().toISOString();
    const newInstruction: SavedInstruction = {
      id: generateId(),
      ...draft,
      createdAt: now,
      updatedAt: now,
    };
    setInstructions((prev) => [newInstruction, ...prev]);
    return newInstruction;
  }, []);

  const update = useCallback(
    (id: string, draft: Partial<InstructionDraft>): void => {
      setInstructions((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...draft, updatedAt: new Date().toISOString() }
            : item
        )
      );
    },
    []
  );

  const remove = useCallback((id: string): void => {
    setInstructions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const togglePin = useCallback((id: string): void => {
    setInstructions((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  // Pinned items first, then sorted by most recently updated
  const sorted = [...instructions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { instructions: sorted, hydrated, add, update, remove, togglePin };
}
