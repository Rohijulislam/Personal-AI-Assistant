"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
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
  Sun,
  Moon,
  X,
  BrainCircuit,
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
};

export function MobileNavDrawer() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useAppUI();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <AnimatePresence>
        {mobileNavOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-surface-raised border-r border-border flex flex-col shadow-2xl sm:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
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
                      className="p-1.5 rounded-lg text-text-muted hover:bg-surface-sunken hover:text-text-primary transition-colors"
                      aria-label="Close navigation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <nav
                  className="flex-1 px-2 py-3 space-y-4 overflow-y-auto"
                  aria-label="Main navigation"
                >
                  {navGroups.map((group, i) => {
                    const items = navItems.filter((item) =>
                      group.ids.includes(item.id),
                    );
                    return (
                      <div
                        key={i}
                        className={clsx(
                          "space-y-0.5",
                          i > 0 && "pt-3 border-t border-border-subtle",
                        )}
                      >
                        {group.label && (
                          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                            {group.label}
                          </p>
                        )}
                        {items.map((item) => {
                          const Icon = iconMap[item.icon] ?? LayoutDashboard;
                          const isActive =
                            pathname === item.href ||
                            (item.href !== "/" &&
                              pathname.startsWith(item.href));

                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setMobileNavOpen(false)}
                              className={clsx(
                                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150",
                                isActive
                                  ? "bg-accent-subtle text-accent font-medium"
                                  : "text-text-secondary active:bg-surface-sunken hover:bg-surface-sunken hover:text-text-primary",
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <Icon
                                className={clsx(
                                  "w-4 h-4 shrink-0",
                                  isActive ? "text-accent" : "text-text-muted",
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

                <div className="px-2 py-3 border-t border-border">
                  <button
                    onClick={() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    }
                    className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-text-primary"
                  >
                    {mounted && resolvedTheme === "dark" ? (
                      <Sun
                        className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Moon
                        className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary"
                        aria-hidden="true"
                      />
                    )}
                    {mounted && resolvedTheme === "dark"
                      ? "Light mode"
                      : "Dark mode"}
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
