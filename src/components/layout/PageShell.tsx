"use client";

import { useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Terminal,
  BookMarked,
  History,
  Settings,
  Menu,
  BrainCircuit,
  LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppUI } from "@/components/layout/AppUIProvider";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Terminal,
  BookMarked,
  History,
  Settings,
  BrainCircuit,
};

interface PageShellProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}

export function PageShell({
  title,
  description,
  icon,
  color,
  children,
}: PageShellProps) {
  const Icon = iconMap[icon] ?? LayoutDashboard;
  const { setMobileNavOpen } = useAppUI();

  useEffect(() => {
    document.title = `${title} · My Assistant`;
  }, [title]);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-4 sm:px-6 py-5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="sm:hidden -ml-1 p-1.5 rounded-lg text-text-muted hover:bg-surface-sunken"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            className={clsx(
              "flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center",
              color,
            )}
          >
            <Icon className="w-4.5 h-4.5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">
              {title}
            </h1>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
