"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string; icon: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  /** Unique per control instance — framer-motion groups the sliding highlight by this id */
  layoutId: string;
  /** Literal Tailwind gradient classes for the active pill, e.g. "from-amber-500 to-orange-500" */
  activeGradient: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  activeGradient,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] p-1 overflow-x-auto">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={clsx(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
              active ? "text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={clsx(
                  "absolute inset-0 rounded-full bg-gradient-to-r shadow-sm",
                  activeGradient
                )}
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
