import {
  LayoutDashboard,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Terminal,
  BookMarked,
  History,
  LucideIcon,
} from "lucide-react";
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
};

export function toolLabel(toolId: ToolId): string {
  return navItems.find((n) => n.id === toolId)?.label ?? toolId;
}

export function ToolIcon({ toolId, className }: { toolId: ToolId; className?: string }) {
  const item = navItems.find((n) => n.id === toolId);
  const Icon = iconMap[item?.icon ?? ""] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden="true" />;
}

interface SparklineProps {
  data: { date: string; count: number }[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 280, height = 56 }: SparklineProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d.count / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${data.reduce((s, d) => s + d.count, 0)} generations over the last ${data.length} days`}
    >
      <polygon points={areaPoints} fill="var(--color-accent-subtle)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
          <ToolIcon toolId={d.toolId} className="w-3.5 h-3.5 text-text-muted shrink-0" />
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
