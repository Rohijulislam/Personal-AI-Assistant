import {
  LayoutDashboard,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Terminal,
  BookMarked,
  History,
  BrainCircuit,
  MessageSquare,
  Settings,
  LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { navItems } from "@/lib/nav-items";
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
  BrainCircuit,
  MessageSquare,
  Settings,
};

export function toolLabel(toolId: ToolId): string {
  return navItems.find((n) => n.id === toolId)?.label ?? toolId;
}

export function ToolIcon({
  toolId,
  className,
}: {
  toolId: ToolId;
  className?: string;
}) {
  const item = navItems.find((n) => n.id === toolId);
  const Icon = iconMap[item?.icon ?? ""] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden="true" />;
}

interface WeeklyActivityChartProps {
  data: { date: string; count: number }[];
}

/** Seven-day bar chart with day-of-week labels — a legible replacement for a raw sparkline. */
export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div
      className="flex items-end gap-2 h-24"
      role="img"
      aria-label={`${total} generations over the last ${data.length} days`}
    >
      {data.map((d) => {
        const dayLabel = new Date(`${d.date}T00:00:00`).toLocaleDateString(
          undefined,
          { weekday: "narrow" },
        );
        const heightPct = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 0;
        return (
          <div
            key={d.date}
            className="flex flex-1 flex-col items-center gap-1.5 h-full"
          >
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                title={`${d.count} on ${d.date}`}
                className={clsx(
                  "w-full max-w-3.5 rounded-[2px] transition-[height] duration-300",
                  d.count > 0 ? "bg-accent" : "bg-surface-sunken",
                )}
                style={{ height: `${d.count > 0 ? heightPct : 4}%` }}
              />
            </div>
            <span className="text-[9px] font-medium uppercase text-text-muted">
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ToolBarBreakdownProps {
  data: { toolId: ToolId; count: number }[];
}

export function ToolBarBreakdown({ data }: ToolBarBreakdownProps) {
  if (data.length === 0) {
    return <p className="text-xs text-text-muted">No activity yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.toolId} className="flex items-center gap-2.5">
          <ToolIcon
            toolId={d.toolId}
            className="w-3.5 h-3.5 text-text-muted shrink-0"
          />
          <span className="text-xs text-text-secondary w-28 shrink-0 truncate">
            {toolLabel(d.toolId)}
          </span>
          <div className="flex-1 h-2 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted tabular-nums w-5 text-right shrink-0">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}
