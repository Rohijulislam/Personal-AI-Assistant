"use client";

import { useState } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import type { SavedCommand, CommandCategory } from "@/types";

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  git: "Git",
  shell: "Shell",
  xcode: "Xcode",
  cocoapods: "CocoaPods",
  "swift-pm": "Swift PM",
  fastlane: "Fastlane",
  flutter: "Flutter",
  other: "Other",
};

const CATEGORY_BADGE_VARIANT: Record<
  CommandCategory,
  "default" | "success" | "warning" | "error" | "info"
> = {
  git: "warning",
  shell: "default",
  xcode: "info",
  cocoapods: "success",
  "swift-pm": "success",
  fastlane: "error",
  flutter: "info",
  other: "default",
};

interface CommandCardProps {
  command: SavedCommand;
  onEdit: (command: SavedCommand) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function CommandCard({ command, onEdit, onDelete, onToggleFavorite }: CommandCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(command.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <Card
      className={clsx(
        "transition-shadow duration-150 hover:shadow-md",
        command.favorite && "ring-1 ring-amber-400/40",
      )}
    >
      <CardBody className="pb-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">
              {command.title}
            </span>
            <Badge variant={CATEGORY_BADGE_VARIANT[command.category]}>
              {CATEGORY_LABELS[command.category]}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleFavorite(command.id)}
              title={command.favorite ? "Remove from favorites" : "Add to favorites"}
              aria-label={command.favorite ? "Remove from favorites" : "Add to favorites"}
              className="p-1.5 rounded-md text-text-muted hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Star
                className={clsx(
                  "w-3.5 h-3.5",
                  command.favorite && "fill-amber-400 text-amber-500",
                )}
              />
            </button>
            <button
              onClick={() => onEdit(command)}
              title="Edit"
              aria-label="Edit command"
              className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteClick}
              title={confirmDelete ? "Click again to confirm" : "Delete"}
              aria-label={confirmDelete ? "Confirm delete" : "Delete command"}
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

        {/* Description */}
        {command.description && (
          <p className="text-xs text-text-muted leading-relaxed mb-2">
            {command.description}
          </p>
        )}

        {/* Command block */}
        <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed rounded-lg px-3 py-2.5 border border-border-subtle bg-surface-sunken text-text-secondary">
          {command.command}
        </pre>

        {/* Tags */}
        {command.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {command.tags.map((tag) => (
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
          {new Date(command.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <CopyButton text={command.command} />
      </CardFooter>
    </Card>
  );
}
