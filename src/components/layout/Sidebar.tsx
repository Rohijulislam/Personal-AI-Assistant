"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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
  Sparkles,
  Search,
  Sun,
  Moon,
  LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { navItems } from "@/lib/nav-items";
import { useAppUI } from "@/components/layout/AppUIProvider";
import type { ToolId } from "@/types";

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
};

const GROUPS: { label: string | null; ids: ToolId[] }[] = [
  { label: null, ids: ["dashboard"] },
  {
    label: "AI Tools",
    ids: ["daily-status", "prompt-rewriter", "text-refiner", "task-generator"],
  },
  {
    label: "Library",
    ids: ["command-library", "saved-instructions", "history"],
  },
  {
    label: "Preferences",
    ids: ["settings"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useAppUI();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // One-time mount flag so the theme icon only renders after hydration
    // (resolvedTheme is undefined on the server, avoiding a mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <aside className="hidden sm:flex sm:w-16 lg:w-60 shrink-0 h-screen flex-col bg-surface-raised border-r border-border overflow-y-auto overflow-x-hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="hidden lg:block">
          <span className="text-sm font-semibold text-text-primary tracking-tight">
            My Assistant
          </span>
          <p className="text-[10px] text-text-muted leading-none mt-0.5">
            Personal AI tools
          </p>
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-2 pt-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken transition-colors duration-150"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="hidden lg:inline flex-1 text-left">Search</span>
          <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4" aria-label="Main navigation">
        {GROUPS.map((group, i) => {
          const items = navItems.filter((item) => group.ids.includes(item.id));
          return (
            <div key={i} className="space-y-0.5">
              {group.label && (
                <p className="hidden lg:block px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {group.label}
                </p>
              )}
              {items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.label}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                      isActive
                        ? "bg-accent-subtle text-accent font-medium"
                        : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={clsx(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-accent" : "text-text-muted"
                      )}
                      aria-hidden="true"
                    />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-2">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-sunken transition-colors duration-150"
          title={mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
          )}
          <span className="hidden lg:inline">
            {mounted && resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>
        <p className="hidden lg:block px-3 text-[10px] text-text-muted">
          Powered by Google AI &amp; Groq
        </p>
      </div>
    </aside>
  );
}
