"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string; icon: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  mobileColumns: 2 | 3;
  /** Unique per control instance — framer-motion groups the sliding highlight by this id */
  layoutId: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  mobileColumns,
  layoutId,
}: SegmentedControlProps<T>) {
  const columnsClass = mobileColumns === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div
      className={clsx(
        "grid w-full gap-0.5 rounded-md border border-border bg-surface-sunken p-0.5 sm:flex sm:w-fit",
        columnsClass,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={clsx(
              "relative flex min-w-0 items-center justify-center gap-1.5 rounded-[3px] px-2 py-2 text-center text-xs font-medium leading-tight transition-colors duration-150 cursor-pointer sm:whitespace-nowrap sm:px-3 sm:py-1.5",
              active
                ? "text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[3px] bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="relative w-3.5 h-3.5 shrink-0" />
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
