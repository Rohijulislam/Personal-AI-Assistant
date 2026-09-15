"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface ToolActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** Literal Tailwind gradient classes, e.g. "from-blue-500 to-cyan-500" */
  gradient: string;
  /** Literal Tailwind shadow-color classes for the hover glow, e.g. "hover:shadow-blue-500/40" */
  glow?: string;
  className?: string;
  type?: "button" | "submit";
}

/**
 * Glossy, rounded-full gradient CTA — the Raycast/Arc-style primary action
 * for each AI tool, distinct from the app's standard `Button` used in
 * forms and toolbars elsewhere.
 */
export function ToolActionButton({
  onClick,
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  gradient,
  glow,
  className,
  type = "button",
}: ToolActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "group relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        gradient,
        glow,
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-80 mix-blend-overlay" />
      {loading ? (
        <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
