"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CommandCard, CATEGORY_LABELS } from "@/components/tools/CommandCard";
import { CommandFormModal } from "@/components/tools/CommandFormModal";
import { useCommandLibrary } from "@/lib/hooks/useCommandLibrary";
import type { SavedCommand, CommandCategory } from "@/types";
import type { CommandDraft } from "@/lib/hooks/useCommandLibrary";

const CATEGORY_FILTERS: { value: CommandCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.keys(CATEGORY_LABELS) as CommandCategory[]).map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
  })),
];

export default function CommandLibraryPage() {
  const { commands, hydrated, add, update, remove, toggleFavorite } = useCommandLibrary();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedCommand | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CommandCategory | "all">("all");

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(command: SavedCommand) {
    setEditing(command);
    setModalOpen(true);
  }

  function handleSave(draft: CommandDraft) {
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
    return commands.filter((cmd) => {
      const matchesCategory = categoryFilter === "all" || cmd.category === categoryFilter;
      const matchesSearch =
        !q ||
        cmd.title.toLowerCase().includes(q) ||
        cmd.command.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.tags.some((t) => t.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [commands, search, categoryFilter]);

  return (
    <>
      <PageShell
        title="Command Library"
        description="Save and search terminal, Git, Flutter, and Xcode commands, shortcuts, and snippets"
        icon="Terminal"
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
                placeholder="Search commands…"
                aria-label="Search commands"
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
                      ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white"
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Skeleton key={n} className="h-40" />
                ))}
              </div>
            ) : commands.length === 0 ? (
              /* True empty state */
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <div className="w-12 h-12 rounded-md border border-border flex items-center justify-center">
                  <Terminal className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    No saved commands yet
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Save the terminal, Git, Flutter, or Xcode commands you reach for often.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="w-3.5 h-3.5" />
                  Add your first command
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              /* Search / filter empty state */
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-sm text-text-muted">
                  No commands match your search.
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-4">
                <AnimatePresence initial={false}>
                  {filtered.map((cmd) => (
                    <motion.div
                      key={cmd.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CommandCard
                        command={cmd}
                        onEdit={openEdit}
                        onDelete={remove}
                        onToggleFavorite={toggleFavorite}
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
        <CommandFormModal command={editing} onSave={handleSave} onClose={handleClose} />
      )}
    </>
  );
}
