"use client";

import { useEffect } from "react";
import { navItems } from "@/lib/nav-items";
import { ToolCard } from "@/components/tools/ToolCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Sparkline, ToolBarBreakdown } from "@/components/tools/UsageCharts";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { useCommandLibrary } from "@/lib/hooks/useCommandLibrary";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import { lastNDaysCounts, toolCounts } from "@/lib/usage-stats";
import { useAppUI } from "@/components/layout/AppUIProvider";
import { Menu, Zap, Terminal, BookMarked } from "lucide-react";

// Dashboard shows all tools except itself
const tools = navItems.filter((item) => item.id !== "dashboard");

export default function DashboardPage() {
  const { entries } = useUsageLog();
  const { commands } = useCommandLibrary();
  const { instructions } = useSavedInstructions();
  const { setMobileNavOpen } = useAppUI();
  const dailyCounts = lastNDaysCounts(entries, 7);
  const totalThisWeek = dailyCounts.reduce((sum, d) => sum + d.count, 0);
  const topTools = toolCounts(entries, 7).slice(0, 3);

  useEffect(() => {
    document.title = "Dashboard · My Assistant";
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-5 border-b border-border bg-surface-raised">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="sm:hidden -ml-1 p-1.5 rounded-lg text-text-muted hover:bg-surface-sunken"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-text-primary">
            Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Your personal AI toolkit — pick a tool to get started.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Stats strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              icon={Zap}
              accent="from-violet-500 to-purple-600"
              value={entries.length}
              label="Generations"
            />
            <StatCard
              icon={Terminal}
              accent="from-slate-500 to-zinc-600"
              value={commands.length}
              label="Saved commands"
            />
            <StatCard
              icon={BookMarked}
              accent="from-indigo-500 to-blue-600"
              value={instructions.length}
              label="Saved instructions"
            />
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Tool grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4 flex-1 w-full">
              {tools.map((item) => (
                <ToolCard key={item.id} item={item} />
              ))}
            </div>

            {/* Usage panel */}
            <div className="w-full xl:w-72 shrink-0 flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Activity — last 7 days
                  </h2>
                </CardHeader>
                <CardBody>
                  {totalThisWeek > 0 ? (
                    <>
                      <Sparkline data={dailyCounts} />
                      <p className="mt-2 text-xs text-text-muted">
                        {totalThisWeek} generation{totalThisWeek === 1 ? "" : "s"} this week
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
                  <ToolBarBreakdown data={topTools} />
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  accent,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5 shadow-sm">
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-text-primary tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-xs text-text-muted truncate">{label}</p>
      </div>
    </div>
  );
}
