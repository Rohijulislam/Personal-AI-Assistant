"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
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
  Search,
  Sun,
  Moon,
  ChevronLeft,
  BrainCircuit,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { navItems, navGroups } from "@/lib/nav-items";
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

export function Sidebar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen, sidebarCollapsed, setSidebarCollapsed } =
    useAppUI();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // One-time mount flag so the theme icon only renders after hydration
    // (resolvedTheme is undefined on the server, avoiding a mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const collapsed = mounted && sidebarCollapsed;

  return (
    <aside
      className={clsx(
        "hidden sm:flex relative shrink-0 h-screen flex-col bg-surface-raised border-r border-border overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-out",
        collapsed ? "sm:w-16" : "sm:w-16 lg:w-60",
      )}
    >
      {/* Collapse toggle — floats on the edge, only meaningful at lg+ */}
      <button
        onClick={() => setSidebarCollapsed((c) => !c)}
        className="hidden lg:flex absolute -right-3 top-14 z-20 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface-raised text-text-muted shadow-sm transition-colors hover:text-accent hover:border-accent/40"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          className={clsx(
            "w-3.5 h-3.5 transition-transform duration-200",
            collapsed && "rotate-180",
          )}
        />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-[5px] bg-accent flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white leading-none">A</span>
        </div>
        <div className={clsx("min-w-0 hidden", !collapsed && "lg:block")}>
          <span className="block text-sm font-semibold text-text-primary tracking-tight truncate">
            My Assistant
          </span>
          <p className="text-[10px] text-text-muted leading-none mt-0.5 truncate">
            Personal AI tools
          </p>
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-2 pt-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className={clsx(
            "group flex w-full items-center gap-3 rounded-lg border border-border/70 bg-surface-sunken/60 text-sm text-text-secondary transition-colors duration-150 hover:border-accent/30 hover:bg-surface-sunken hover:text-text-primary",
            collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
          )}
          title="Search (⌘K)"
        >
          <Search
            className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent transition-colors"
            aria-hidden="true"
          />
          <span
            className={clsx(
              "hidden flex-1 text-left",
              !collapsed && "lg:inline",
            )}
          >
            Search
          </span>
          <kbd
            className={clsx(
              "hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted",
              !collapsed && "lg:inline",
            )}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4" aria-label="Main navigation">
        {navGroups.map((group, i) => {
          const items = navItems.filter((item) => group.ids.includes(item.id));
          return (
            <div
              key={i}
              className={clsx(
                "space-y-0.5",
                i > 0 && "pt-3 border-t border-border-subtle",
              )}
            >
              {group.label && (
                <p
                  className={clsx(
                    "hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted",
                    !collapsed && "lg:block",
                  )}
                >
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
                      "group relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors duration-150",
                      collapsed ? "justify-center px-0" : "px-3",
                      isActive
                        ? "text-accent font-medium"
                        : "text-text-secondary hover:text-text-primary",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-lg bg-accent-subtle"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 38,
                          mass: 0.6,
                        }}
                      />
                    )}
                    {!isActive && (
                      <span className="absolute inset-0 rounded-lg bg-surface-sunken opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                    )}
                    <Icon
                      className={clsx(
                        "relative z-10 w-4 h-4 shrink-0",
                        isActive
                          ? "text-accent"
                          : "text-text-muted group-hover:text-text-primary",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={clsx(
                        "relative z-10 hidden truncate",
                        !collapsed && "lg:inline",
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Tooltip shown only when the rail is icon-only */}
                    <span
                      className={clsx(
                        "pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-text-primary opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100",
                        collapsed ? "lg:block" : "lg:hidden",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-1">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className={clsx(
            "group relative flex w-full items-center gap-3 rounded-lg py-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary",
            collapsed ? "justify-center px-0" : "px-3",
          )}
          title={
            mounted && resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          <span className="absolute inset-0 rounded-lg bg-surface-sunken opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
          {mounted && resolvedTheme === "dark" ? (
            <Sun
              className="relative z-10 w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary"
              aria-hidden="true"
            />
          ) : (
            <Moon
              className="relative z-10 w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary"
              aria-hidden="true"
            />
          )}
          <span
            className={clsx("relative z-10 hidden", !collapsed && "lg:inline")}
          >
            {mounted && resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>
        <p
          className={clsx(
            "hidden px-3 pt-1 text-[10px] text-text-muted",
            !collapsed && "lg:block",
          )}
        >
          Powered by Google AI &amp; Groq
        </p>
      </div>
    </aside>
  );
}
