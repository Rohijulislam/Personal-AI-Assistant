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
import { clsx } from "clsx";
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
      className="group block rounded-xl border border-border bg-surface-raised p-5 shadow-sm hover:shadow-md hover:border-text-muted transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            "flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
            item.color,
          )}
        >
          <Icon className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
            {item.label}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
