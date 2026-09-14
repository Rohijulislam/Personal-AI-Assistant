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
