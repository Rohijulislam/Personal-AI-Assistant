"use client";

import { useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
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
  LucideIcon,
} from "lucide-react";
import { navItems } from "@/lib/nav-items";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
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
};

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppUI();
  const { instructions } = useSavedInstructions();
  const { entries } = useUsageLog();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  const goto = (href: string) => {
    setCommandPaletteOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      label="Command palette"
      className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg"
      overlayClassName="fixed inset-0 z-50 bg-black/40"
      contentClassName="p-0"
    >
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <Command.Input
          placeholder="Search tools, saved instructions, history…"
          className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
        />
        <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-text-muted shrink-0">
          Esc
        </kbd>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-text-muted">
          No results found.
        </Command.Empty>

        <Command.Group
          heading="Navigate"
        >
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            return (
              <Command.Item
                key={item.id}
                value={`${item.label} ${item.description}`}
                onSelect={() => goto(item.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary"
              >
                <Icon className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-text-muted">{item.description}</span>
                </div>
              </Command.Item>
            );
          })}
        </Command.Group>

        {instructions.length > 0 && (
          <Command.Group
            heading="Saved instructions"
          >
            {instructions.slice(0, 8).map((instr) => (
              <Command.Item
                key={instr.id}
                value={`${instr.title} ${instr.tags.join(" ")}`}
                onSelect={() => goto("/saved-instructions")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary"
              >
                <BookMarked className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="truncate">{instr.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {entries.length > 0 && (
          <Command.Group
            heading="Recent history"
          >
            {entries.slice(0, 5).map((entry) => (
              <Command.Item
                key={entry.id}
                value={`${entry.toolId} ${entry.prompt}`}
                onSelect={() => goto("/history")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary"
              >
                <History className="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="truncate">{entry.prompt || entry.text}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
