import type { UsageEntry } from "@/lib/hooks/useUsageLog";
import type { ToolId } from "@/types";

export function lastNDaysCounts(
  entries: UsageEntry[],
  days: number
): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const entry of entries) {
    const key = entry.createdAt.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export function toolCounts(
  entries: UsageEntry[],
  days?: number
): { toolId: ToolId; count: number }[] {
  const cutoff = days ? Date.now() - days * 86_400_000 : null;
  const counts = new Map<ToolId, number>();
  for (const entry of entries) {
    if (cutoff && new Date(entry.createdAt).getTime() < cutoff) continue;
    counts.set(entry.toolId, (counts.get(entry.toolId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([toolId, count]) => ({ toolId, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupByDay(
  entries: UsageEntry[]
): [day: string, entries: UsageEntry[]][] {
  const groups = new Map<string, UsageEntry[]>();
  for (const entry of entries) {
    const key = entry.createdAt.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function formatDayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKey === today.toISOString().slice(0, 10)) return "Today";
  if (dateKey === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Total generations in the trailing 7 days vs. the 7 days before that. */
export function weekOverWeek(entries: UsageEntry[]): {
  thisWeek: number;
  lastWeek: number;
} {
  const buckets = lastNDaysCounts(entries, 14);
  const lastWeek = buckets.slice(0, 7).reduce((sum, d) => sum + d.count, 0);
  const thisWeek = buckets.slice(7).reduce((sum, d) => sum + d.count, 0);
  return { thisWeek, lastWeek };
}

/** Short, human relative time string, e.g. "Just now", "12m ago", "3d ago". */
export function relativeTimeFromNow(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
