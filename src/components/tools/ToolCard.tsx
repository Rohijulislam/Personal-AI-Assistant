import Link from "next/link";
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
  BrainCircuit,
  MessageSquare,
  ArrowUpRight,
  LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/types";

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

interface ToolCardProps {
  item: NavItem;
}

export function ToolCard({ item }: ToolCardProps) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      className="group flex min-h-24 items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        <Icon
          className="h-4 w-4"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">
          {item.label}
        </h3>
        <p className="mt-1 text-xs leading-5 text-text-muted">{item.description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
