"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { navItems, navGroups } from "@/lib/nav-items";
import { ToolCard } from "@/components/tools/ToolCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import {
  WeeklyActivityChart,
  ToolBarBreakdown,
  ToolIcon,
  toolLabel,
} from "@/components/tools/UsageCharts";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { useCommandLibrary } from "@/lib/hooks/useCommandLibrary";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import {
  lastNDaysCounts,
  toolCounts,
  weekOverWeek,
  relativeTimeFromNow,
} from "@/lib/usage-stats";
import { useAppUI } from "@/components/layout/AppUIProvider";
import {
  Menu,
  Zap,
  Terminal,
  BookMarked,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

function getGreeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { entries, hydrated: usageHydrated } = useUsageLog();
  const { commands, hydrated: commandsHydrated } = useCommandLibrary();
  const { instructions, hydrated: instructionsHydrated } =
    useSavedInstructions();
  const { setMobileNavOpen } = useAppUI();
  const [mounted, setMounted] = useState(false);

  const ready = usageHydrated && commandsHydrated && instructionsHydrated;

  useEffect(() => {
    document.title = "Dashboard · My Assistant";
  }, []);

  useEffect(() => {
    // Greeting/date depend on the viewer's local clock — render a static
    // fallback on the server and swap in after mount to avoid a hydration
    // mismatch (same pattern as the sidebar's theme toggle).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const now = new Date();
  const dailyCounts = lastNDaysCounts(entries, 7);
  const totalThisWeek = dailyCounts.reduce((sum, d) => sum + d.count, 0);
  const topTools = toolCounts(entries, 7).slice(0, 3);
  const { thisWeek, lastWeek } = weekOverWeek(entries);
  const weekDelta = thisWeek - lastWeek;
  const recent = entries.slice(0, 3);

  // The sidebar splits "Start here" (dashboard/command-center/chat) from
  // "AI Tools" for a short, scannable nav list — but on the dashboard grid
  // those read as one flat set of tools, so merge them into a single section.
  const dashboardGroups = [
    { label: "AI Tools", ids: [...navGroups[0].ids, ...navGroups[1].ids] },
    ...navGroups.slice(2),
  ];
  const toolGroups = dashboardGroups
    .map((group) => ({
      label: group.label,
      items: navItems.filter(
        (item) => group.ids.includes(item.id) && item.id !== "dashboard",
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-5 border-b border-border bg-surface-raised">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="sm:hidden -ml-1 p-1.5 rounded-md text-text-muted hover:bg-surface-sunken"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-text-primary">
            {mounted ? `${getGreeting(now.getHours())}` : "Dashboard"}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {mounted
              ? now.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "Your personal AI toolkit — pick a tool to get started."}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Overview — deliberately low-key: small chips, not a headline stat block */}
          <div className="flex flex-wrap items-center gap-2">
            {!ready ? (
              <>
                <Skeleton className="h-7 w-32 rounded-md" />
                <Skeleton className="h-7 w-36 rounded-md" />
                <Skeleton className="h-7 w-36 rounded-md" />
              </>
            ) : (
              <>
                <OverviewStat
                  icon={Zap}
                  label="Generations"
                  value={entries.length}
                  trend={
                    thisWeek > 0 || lastWeek > 0 ? (
                      <TrendChip delta={weekDelta} />
                    ) : undefined
                  }
                />
                <OverviewStat
                  icon={Terminal}
                  label="Saved commands"
                  value={commands.length}
                />
                <OverviewStat
                  icon={BookMarked}
                  label="Saved instructions"
                  value={instructions.length}
                />
              </>
            )}
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Tool grid, grouped to match the sidebar's information architecture */}
            <div className="flex flex-col gap-6 flex-1 w-full">
              {toolGroups.map((group, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted px-0.5">
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <ToolCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Usage panel */}
            <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
              <Card>
                <CardHeader className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Recent activity
                  </h2>
                  {ready && entries.length > 0 && (
                    <Link
                      href="/history"
                      className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline shrink-0"
                    >
                      View all
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardBody className="flex flex-col gap-3">
                  {!ready ? (
                    <SkeletonLines lines={3} />
                  ) : recent.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      Nothing yet — run a tool and it&apos;ll show up here.
                    </p>
                  ) : (
                    recent.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-[5px] border border-border flex items-center justify-center shrink-0">
                          <ToolIcon
                            toolId={entry.toolId}
                            className="w-3.5 h-3.5 text-text-secondary"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-text-primary truncate">
                              {toolLabel(entry.toolId)}
                            </span>
                            <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                              {relativeTimeFromNow(entry.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Activity — last 7 days
                  </h2>
                </CardHeader>
                <CardBody>
                  {!ready ? (
                    <Skeleton className="h-24" />
                  ) : totalThisWeek > 0 ? (
                    <>
                      <WeeklyActivityChart data={dailyCounts} />
                      <p className="mt-2.5 text-xs text-text-muted">
                        {totalThisWeek} generation
                        {totalThisWeek === 1 ? "" : "s"} this week
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">
                      Use a tool to start tracking your activity.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Most used
                  </h2>
                </CardHeader>
                <CardBody>
                  {!ready ? (
                    <SkeletonLines lines={3} />
                  ) : (
                    <ToolBarBreakdown data={topTools} />
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendChip({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
        positive ? "text-success" : "text-danger",
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(delta)}
    </span>
  );
}

function OverviewStat({
  icon: Icon,
  value,
  label,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  trend?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-2.5 py-1.5 text-xs">
      <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
      <span className="font-semibold text-text-primary tabular-nums font-mono">
        {value}
      </span>
      <span className="text-text-muted">{label}</span>
      {trend}
    </span>
  );
}
