"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { X, Plus } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { SavedInstruction, InstructionCategory } from "@/types";
import type { InstructionDraft } from "@/lib/hooks/useSavedInstructions";

const CATEGORIES: { value: InstructionCategory; label: string }[] = [
  { value: "git", label: "Git" },
  { value: "shell", label: "Shell" },
  { value: "credentials", label: "Credentials" },
  { value: "ai-prompt", label: "AI Prompt" },
  { value: "workflow", label: "Workflow" },
  { value: "other", label: "Other" },
];

interface InstructionFormModalProps {
  /** null = create mode; non-null = edit mode */
  instruction: SavedInstruction | null;
  onSave: (draft: InstructionDraft) => void;
  onClose: () => void;
}

const EMPTY_DRAFT: InstructionDraft = {
  title: "",
  content: "",
  category: "shell",
  tags: [],
  pinned: false,
};

export function InstructionFormModal({
  instruction,
  onSave,
  onClose,
}: InstructionFormModalProps) {
  const [draft, setDraft] = useState<InstructionDraft>(EMPTY_DRAFT);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const titleRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (instruction) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDraft({
        title: instruction.title,
        content: instruction.content,
        category: instruction.category,
        tags: instruction.tags,
        pinned: instruction.pinned,
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      setDraft(EMPTY_DRAFT);
    }
    setTagInput("");
    setErrors({});
  }, [instruction]);

  function set<K extends keyof InstructionDraft>(key: K, value: InstructionDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (key === "title" || key === "content") {
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
    if (!draft.content.trim()) errs.content = "Content is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...draft, title: draft.title.trim(), content: draft.content.trim() });
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
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-surface-raised rounded-md shadow-xl border border-border flex flex-col max-h-[90vh] data-[state=open]:animate-[dialog-in-center_0.15s_ease-out]"
        >
          <Dialog.Title className="sr-only">
            {instruction ? "Edit Instruction" : "New Instruction"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Create or edit a saved instruction, command, or credential.
          </Dialog.Description>

          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">
              {instruction ? "Edit Instruction" : "New Instruction"}
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
            id="instruction-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 px-5 py-4 overflow-y-auto"
          >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="instr-title"
                className="text-sm font-medium text-text-secondary"
              >
                Title
              </label>
              <input
                ref={titleRef}
                id="instr-title"
                type="text"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. arc land onto develop"
                className={clsx(
                  "w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
                  errors.title ? "border-danger" : "border-border"
                )}
              />
              {errors.title && (
                <p className="text-xs text-danger">{errors.title}</p>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="instr-category"
                className="text-sm font-medium text-text-secondary"
              >
                Category
              </label>
              <select
                id="instr-category"
                value={draft.category}
                onChange={(e) => set("category", e.target.value as InstructionCategory)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <Textarea
              id="instr-content"
              label="Content"
              value={draft.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder={`Paste your command, path export, password, prompt, or note here…`}
              rows={6}
              error={errors.content}
            />

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="instr-tags"
                className="text-sm font-medium text-text-secondary"
              >
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
                  id="instr-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  placeholder={draft.tags.length === 0 ? "vpn, arcanist, git…" : ""}
                  className="flex-1 min-w-[100px] bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
              </div>
            </div>

            {/* Pin toggle */}
            <div className="flex items-center gap-2.5 w-fit">
              <Switch.Root
                id="instr-pinned"
                checked={draft.pinned}
                onCheckedChange={(checked) => set("pinned", checked)}
                className={clsx(
                  "w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 relative shrink-0",
                  draft.pinned ? "bg-indigo-500" : "bg-surface-sunken"
                )}
              >
                <Switch.Thumb
                  className={clsx(
                    "block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    draft.pinned ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </Switch.Root>
              <label htmlFor="instr-pinned" className="text-sm text-text-secondary cursor-pointer select-none">
                Pin to top
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle bg-surface-sunken/50 rounded-b-md">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="primary" size="sm" type="submit" form="instruction-form">
              <Plus className="w-3.5 h-3.5" />
              {instruction ? "Save changes" : "Add instruction"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
