"use client";

import { navItems } from "@/lib/nav-items";
import { ToolCard } from "@/components/tools/ToolCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Sparkline, ToolBarBreakdown } from "@/components/tools/UsageCharts";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { lastNDaysCounts, toolCounts } from "@/lib/usage-stats";
import { useAppUI } from "@/components/layout/AppUIProvider";
import { Menu } from "lucide-react";

// Dashboard shows all tools except itself
const tools = navItems.filter((item) => item.id !== "dashboard");

export default function DashboardPage() {
  const { entries } = useUsageLog();
  const { setMobileNavOpen } = useAppUI();
  const dailyCounts = lastNDaysCounts(entries, 7);
  const totalThisWeek = dailyCounts.reduce((sum, d) => sum + d.count, 0);
  const topTools = toolCounts(entries, 7).slice(0, 3);

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
        <div className="max-w-6xl mx-auto flex flex-col xl:flex-row gap-6 items-start">
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
  );
}
