"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface ToolActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}

/**
 * Flat, solid-accent primary action for a tool workspace — the same visual
 * weight as `Button` primary, sized for a page-level call to action.
 */
export function ToolActionButton({
  onClick,
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  className,
  type = "button",
}: ToolActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "group relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 cursor-pointer",
        "hover:bg-accent-hover active:bg-accent-active",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      {loading ? (
        <svg
          className="h-4 w-4 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
