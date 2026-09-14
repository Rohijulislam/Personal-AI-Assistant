"use client";

import { useState, useMemo } from "react";
import { Plus, Search, BookMarked } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InstructionCard } from "@/components/tools/InstructionCard";
import { InstructionFormModal } from "@/components/tools/InstructionFormModal";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import type { SavedInstruction, InstructionCategory } from "@/types";
import type { InstructionDraft } from "@/lib/hooks/useSavedInstructions";

const CATEGORY_FILTERS: {
  value: InstructionCategory | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "git", label: "Git" },
  { value: "shell", label: "Shell" },
  { value: "credentials", label: "Credentials" },
  { value: "ai-prompt", label: "AI Prompt" },
  { value: "workflow", label: "Workflow" },
  { value: "other", label: "Other" },
];

export default function SavedInstructionsPage() {
  const { instructions, hydrated, add, update, remove, togglePin } =
    useSavedInstructions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedInstruction | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    InstructionCategory | "all"
  >("all");

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(instruction: SavedInstruction) {
    setEditing(instruction);
    setModalOpen(true);
  }

  function handleSave(draft: InstructionDraft) {
    if (editing) {
      update(editing.id, draft);
    } else {
      add(draft);
    }
  }

  function handleClose() {
    setModalOpen(false);
    setEditing(null);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return instructions.filter((instr) => {
      const matchesCategory =
        categoryFilter === "all" || instr.category === categoryFilter;
      const matchesSearch =
        !q ||
        instr.title.toLowerCase().includes(q) ||
        instr.content.toLowerCase().includes(q) ||
        instr.tags.some((t) => t.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [instructions, search, categoryFilter]);

  return (
    <>
      <PageShell
        title="Saved Instructions"
        description="Create and reuse commands, prompts, credentials, and snippets"
        icon="BookMarked"
        color="from-indigo-500 to-blue-600"
      >
        <div className="flex flex-col h-full gap-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search instructions…"
                aria-label="Search instructions"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-surface-raised text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className={
                    categoryFilter === value
                      ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white"
                      : "px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-sunken text-text-secondary hover:bg-border transition-colors"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* New button */}
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </div>

          {/* Card grid / empty states */}
          <div className="flex-1 overflow-y-auto">
            {!hydrated ? (
              /* Loading skeleton */
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-36" />
                ))}
              </div>
            ) : instructions.length === 0 ? (
              /* True empty state */
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    No saved instructions yet
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Save commands, credentials, prompts, or any snippet you
                    reuse often.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="w-3.5 h-3.5" />
                  Add your first instruction
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              /* Search / filter empty state */
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-sm text-text-muted">
                  No instructions match your search.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 pb-4">
                <AnimatePresence initial={false}>
                  {filtered.map((instr) => (
                    <motion.div
                      key={instr.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                    >
                      <InstructionCard
                        instruction={instr}
                        onEdit={openEdit}
                        onDelete={remove}
                        onTogglePin={togglePin}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </PageShell>

      {modalOpen && (
        <InstructionFormModal
          instruction={editing}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </>
  );
}
