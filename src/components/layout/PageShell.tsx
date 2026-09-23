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
      <div className="px-4 sm:px-6 py-5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="sm:hidden -ml-1 p-1.5 rounded-md text-text-muted hover:bg-surface-sunken"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-shrink-0 w-8 h-8 rounded-[5px] border border-border flex items-center justify-center">
            <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
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
