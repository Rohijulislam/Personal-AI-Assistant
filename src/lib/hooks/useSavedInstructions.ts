"use client";

import { useCallback } from "react";
import type { SavedInstruction, InstructionCategory } from "@/types";
import { useUserData } from "@/lib/hooks/useUserData";

function generateId(): string {
  return `instr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type InstructionDraft = {
  title: string;
  content: string;
  category: InstructionCategory;
  tags: string[];
  pinned: boolean;
};

export function useSavedInstructions() {
  const { value: instructions, setValue: setInstructions, hydrated } =
    useUserData<SavedInstruction[]>("saved-instructions", "saved-instructions", []);

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
  }, [setInstructions]);

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
    [setInstructions]
  );

  const remove = useCallback((id: string): void => {
    setInstructions((prev) => prev.filter((item) => item.id !== id));
  }, [setInstructions]);

  const togglePin = useCallback((id: string): void => {
    setInstructions((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, [setInstructions]);

  // Pinned items first, then sorted by most recently updated
  const sorted = [...instructions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { instructions: sorted, hydrated, add, update, remove, togglePin };
}
