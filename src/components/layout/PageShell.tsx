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
  MessageSquare,
  LucideIcon,
} from "lucide-react";
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
  MessageSquare,
};

interface PageShellProps {
  title: string;
  description: string;
  icon: string;
  children: React.ReactNode;
}

export function PageShell({
  title,
  description,
  icon,
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
      <div className="border-b border-border bg-surface-raised px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="-ml-1 rounded-lg p-1.5 text-text-muted hover:bg-surface-sunken sm:hidden"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-subtle">
            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted sm:text-sm">{description}</p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">{children}</div>
    </div>
  );
}
