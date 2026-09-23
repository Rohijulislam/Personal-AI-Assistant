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
      className="group flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3.5 py-3 hover:border-accent/50 transition-colors duration-150"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-[5px] border border-border flex items-center justify-center group-hover:border-accent/50 transition-colors duration-150">
        <Icon
          className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent transition-colors"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
          {item.label}
        </h3>
        <p className="text-xs text-text-muted truncate">{item.description}</p>
      </div>
    </Link>
  );
}
