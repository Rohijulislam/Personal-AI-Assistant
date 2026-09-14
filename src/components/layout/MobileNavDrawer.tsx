"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Terminal,
  BookMarked,
  History,
  Sparkles,
  X,
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
];

export function MobileNavDrawer() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useAppUI();

  return (
    <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <AnimatePresence>
        {mobileNavOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-surface-raised border-r border-border flex flex-col sm:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <div className="flex items-center justify-between gap-2.5 px-4 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-text-primary tracking-tight">
                      My Assistant
                    </span>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="p-1.5 rounded-lg text-text-muted hover:bg-surface-sunken"
                      aria-label="Close navigation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto" aria-label="Main navigation">
                  {GROUPS.map((group, i) => {
                    const items = navItems.filter((item) => group.ids.includes(item.id));
                    return (
                      <div key={i} className="space-y-0.5">
                        {group.label && (
                          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
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
                              onClick={() => setMobileNavOpen(false)}
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
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </nav>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
