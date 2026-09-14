"use client";

import { useState, useEffect, useRef } from "react";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import type { SavedInstruction, InstructionCategory } from "@/types";

const CATEGORY_LABELS: Record<InstructionCategory, string> = {
  git: "Git",
  shell: "Shell",
  credentials: "Credentials",
  "ai-prompt": "AI Prompt",
  workflow: "Workflow",
  other: "Other",
};

const CATEGORY_BADGE_VARIANT: Record<
  InstructionCategory,
  "default" | "success" | "warning" | "error" | "info"
> = {
  git: "warning",
  shell: "default",
  credentials: "error",
  "ai-prompt": "info",
  workflow: "success",
  other: "default",
};

/** How long a credential stays revealed before auto-hiding (ms) */
const REVEAL_TIMEOUT_MS = 30_000;

/** Replace every non-whitespace character with a bullet */
function maskContent(text: string): string {
  return text.replace(/\S/g, "•");
}

interface InstructionCardProps {
  instruction: SavedInstruction;
  onEdit: (instruction: SavedInstruction) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function InstructionCard({
  instruction,
  onEdit,
  onDelete,
  onTogglePin,
}: InstructionCardProps) {
  const isCredential = instruction.category === "credentials";

  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // credentials are hidden by default; other categories start visible
  const [revealed, setRevealed] = useState(!isCredential);
  const [countdown, setCountdown] = useState(0);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // When category changes (e.g. edit), reset reveal state
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isCredential) {
      setRevealed(false);
      setCountdown(0);
    } else {
      setRevealed(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isCredential]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    };
  }, []);

  function startReveal() {
    setRevealed(true);
    setCountdown(Math.round(REVEAL_TIMEOUT_MS / 1000));

    // countdown tick
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownIntervalRef.current)
            clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // auto-hide
    revealTimerRef.current = setTimeout(() => {
      setRevealed(false);
      setExpanded(false);
      setCountdown(0);
    }, REVEAL_TIMEOUT_MS);
  }

  function hide() {
    setRevealed(false);
    setExpanded(false);
    setCountdown(0);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);
  }

  const rawContent = instruction.content;
  const displayContent = revealed ? rawContent : maskContent(rawContent);

  const isLong = rawContent.length > 120;
  const preview =
    isLong && !expanded
      ? revealed
        ? rawContent.slice(0, 120).trimEnd() + "…"
        : maskContent(rawContent.slice(0, 120).trimEnd()) + "…"
      : displayContent;

  const formattedDate = new Date(instruction.updatedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(instruction.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <Card
      className={clsx(
        "transition-shadow duration-150 hover:shadow-md",
        instruction.pinned && "ring-1 ring-indigo-400/40",
        isCredential && !revealed && "ring-1 ring-danger/30",
      )}
    >
      <CardBody className="pb-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">
              {instruction.title}
            </span>
            {instruction.pinned && (
              <Pin
                className="w-3.5 h-3.5 text-indigo-500 shrink-0"
                aria-label="Pinned"
              />
            )}
            <Badge variant={CATEGORY_BADGE_VARIANT[instruction.category]}>
              {CATEGORY_LABELS[instruction.category]}
            </Badge>
            {isCredential && (
              <ShieldAlert
                className="w-3.5 h-3.5 text-danger shrink-0"
                aria-label="Protected credential"
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onTogglePin(instruction.id)}
              title={instruction.pinned ? "Unpin" : "Pin to top"}
              aria-label={instruction.pinned ? "Unpin" : "Pin to top"}
              className="p-1.5 rounded-md text-text-muted hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              {instruction.pinned ? (
                <PinOff className="w-3.5 h-3.5" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => onEdit(instruction)}
              title="Edit"
              aria-label="Edit instruction"
              className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              title={confirmDelete ? "Click again to confirm" : "Delete"}
              aria-label={
                confirmDelete ? "Confirm delete" : "Delete instruction"
              }
              className={clsx(
                "p-1.5 rounded-md transition-colors",
                confirmDelete
                  ? "text-danger bg-danger-subtle"
                  : "text-text-muted hover:text-danger hover:bg-danger-subtle",
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Credential locked banner */}
        {isCredential && !revealed && (
          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 mb-2 bg-danger-subtle border border-danger/20">
            <p className="text-xs text-danger">
              Content hidden — click reveal to view temporarily.
            </p>
            <button
              onClick={startReveal}
              aria-label="Reveal credential"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              Reveal
            </button>
          </div>
        )}

        {/* Content block */}
        <pre
          className={clsx(
            "text-xs font-mono whitespace-pre-wrap break-all leading-relaxed rounded-lg px-3 py-2.5 border select-none",
            revealed
              ? "text-text-secondary bg-surface-sunken border-border-subtle"
              : "text-danger/70 bg-danger-subtle/50 border-danger/20 tracking-widest blur-[1px]",
          )}
          aria-label={revealed ? undefined : "Hidden credential content"}
        >
          {preview}
        </pre>

        {/* Countdown + hide button when revealed */}
        {isCredential && revealed && (
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-danger/80">
              Auto-hides in {countdown}s
            </span>
            <button
              onClick={hide}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <EyeOff className="w-3 h-3" />
              Hide now
            </button>
          </div>
        )}

        {/* Expand / collapse for non-credential long content */}
        {!isCredential && isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Show more
              </>
            )}
          </button>
        )}

        {/* Tags */}
        {instruction.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {instruction.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 rounded-full text-xs bg-surface-sunken text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardBody>

      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Updated {formattedDate}
        </span>
        {/* Copy is only available once content is revealed */}
        {revealed ? (
          <CopyButton text={rawContent} />
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-sunken text-text-muted cursor-not-allowed select-none"
            title="Reveal the credential to enable copying"
            aria-label="Copy disabled — reveal first"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Copy locked
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
