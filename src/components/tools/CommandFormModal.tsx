"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, Plus } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { SavedCommand, CommandCategory } from "@/types";
import type { CommandDraft } from "@/lib/hooks/useCommandLibrary";
import { CATEGORY_LABELS } from "@/components/tools/CommandCard";

const CATEGORIES: { value: CommandCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as CommandCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

interface CommandFormModalProps {
  /** null = create mode; non-null = edit mode */
  command: SavedCommand | null;
  onSave: (draft: CommandDraft) => void;
  onClose: () => void;
}

const EMPTY_DRAFT: CommandDraft = {
  title: "",
  command: "",
  description: "",
  category: "shell",
  tags: [],
  favorite: false,
};

export function CommandFormModal({ command, onSave, onClose }: CommandFormModalProps) {
  const [draft, setDraft] = useState<CommandDraft>(EMPTY_DRAFT);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<{ title?: string; command?: string }>({});

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (command) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDraft({
        title: command.title,
        command: command.command,
        description: command.description,
        category: command.category,
        tags: command.tags,
        favorite: command.favorite,
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      setDraft(EMPTY_DRAFT);
    }
    setTagInput("");
    setErrors({});
  }, [command]);

  function set<K extends keyof CommandDraft>(key: K, value: CommandDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (key === "title" || key === "command") {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function addTag() {
    const tag = tagInput.trim().replace(/^#+/, "").toLowerCase();
    if (tag && !draft.tags.includes(tag)) {
      set("tags", [...draft.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    set("tags", draft.tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && tagInput === "" && draft.tags.length > 0) {
      set("tags", draft.tags.slice(0, -1));
    }
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!draft.title.trim()) errs.title = "Title is required";
    if (!draft.command.trim()) errs.command = "Command is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      command: draft.command.trim(),
      description: draft.description.trim(),
    });
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-[overlay-in_0.15s_ease-out]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            titleRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-surface-raised rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh] data-[state=open]:animate-[dialog-in-center_0.15s_ease-out]"
        >
          <Dialog.Title className="sr-only">
            {command ? "Edit Command" : "New Command"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Create or edit a saved command, shortcut, or snippet.
          </Dialog.Description>

          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">
              {command ? "Edit Command" : "New Command"}
            </h2>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form
            id="command-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 px-5 py-4 overflow-y-auto"
          >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cmd-title" className="text-sm font-medium text-text-secondary">
                Title
              </label>
              <input
                ref={titleRef}
                id="cmd-title"
                type="text"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Delete Derived Data"
                className={clsx(
                  "w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
                  errors.title ? "border-danger" : "border-border"
                )}
              />
              {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cmd-category" className="text-sm font-medium text-text-secondary">
                Category
              </label>
              <select
                id="cmd-category"
                value={draft.category}
                onChange={(e) => set("category", e.target.value as CommandCategory)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Command */}
            <Textarea
              id="cmd-command"
              label="Command"
              value={draft.command}
              onChange={(e) => set("command", e.target.value)}
              placeholder={`e.g. rm -rf ~/Library/Developer/Xcode/DerivedData/*`}
              rows={3}
              className="font-mono"
              error={errors.command}
            />

            {/* Description */}
            <Textarea
              id="cmd-description"
              label="Description"
              hint="Optional — what it does or when to reach for it"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Fixes most phantom build errors and stale previews…"
              rows={2}
            />

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cmd-tags" className="text-sm font-medium text-text-secondary">
                Tags
                <span className="ml-1.5 font-normal text-text-muted text-xs">
                  (optional — press Enter or comma to add)
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
                {draft.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-sunken text-text-secondary"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="text-text-muted hover:text-danger transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  id="cmd-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  placeholder={draft.tags.length === 0 ? "build, simulator, troubleshooting…" : ""}
                  className="flex-1 min-w-[100px] bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
              </div>
            </div>

            {/* Favorite toggle */}
            <div className="flex items-center gap-2.5 w-fit">
              <Switch.Root
                id="cmd-favorite"
                checked={draft.favorite}
                onCheckedChange={(checked) => set("favorite", checked)}
                className={clsx(
                  "w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 relative shrink-0",
                  draft.favorite ? "bg-amber-500" : "bg-surface-sunken"
                )}
              >
                <Switch.Thumb
                  className={clsx(
                    "block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    draft.favorite ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </Switch.Root>
              <label htmlFor="cmd-favorite" className="text-sm text-text-secondary cursor-pointer select-none">
                Mark as favorite
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle bg-surface-sunken/50 rounded-b-2xl">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="primary" size="sm" type="submit" form="command-form">
              <Plus className="w-3.5 h-3.5" />
              {command ? "Save changes" : "Add command"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
