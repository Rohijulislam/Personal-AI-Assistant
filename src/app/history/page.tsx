"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { ToolBarBreakdown, ToolIcon, toolLabel } from "@/components/tools/UsageCharts";
import { useUsageLog } from "@/lib/hooks/useUsageLog";
import { groupByDay, formatDayLabel, toolCounts } from "@/lib/usage-stats";
import { Trash2, History as EmptyIcon } from "lucide-react";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { entries, clearEntry, hydrated } = useUsageLog();
  const [expanded, setExpanded] = useState<string | null>(null);
  const days = groupByDay(entries);
  const breakdown = toolCounts(entries, 7);

  return (
    <PageShell
      title="History"
      description="Recently generated results across all tools"
      icon="History"
      color="from-stone-500 to-neutral-600"
    >
      <div className="max-w-2xl mx-auto space-y-4 h-full overflow-y-auto pb-6">
        {hydrated && entries.length > 0 && (
          <Card>
            <CardBody>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
                Last 7 days by tool
              </h2>
              <ToolBarBreakdown data={breakdown} />
            </CardBody>
          </Card>
        )}

        {hydrated && entries.length === 0 && (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center justify-center gap-2 text-center py-10">
                <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center">
                  <EmptyIcon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-text-muted">No results yet</p>
                <p className="text-xs text-text-muted/70">
                  Generated results from any tool will show up here.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {days.map(([day, dayEntries]) => (
          <div key={day} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted px-1">
              {formatDayLabel(day)}
            </p>
            {dayEntries.map((entry) => {
              const isExpanded = expanded === entry.id;
              return (
                <Card key={entry.id}>
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                        <ToolIcon toolId={entry.toolId} className="w-4 h-4 text-text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {toolLabel(entry.toolId)}
                          </span>
                          <span className="text-xs text-text-muted shrink-0">
                            {formatTime(entry.createdAt)}
                          </span>
                        </div>
                        <p
                          className={
                            isExpanded
                              ? "mt-1 text-sm text-text-secondary whitespace-pre-wrap"
                              : "mt-1 text-sm text-text-secondary line-clamp-2"
                          }
                        >
                          {entry.text}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <ProviderBadge provider={entry.provider} model={entry.model} />
                          <button
                            onClick={() => setExpanded(isExpanded ? null : entry.id)}
                            className="text-xs text-accent hover:underline"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                          <div className="flex-1" />
                          <CopyButton text={entry.text} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearEntry(entry.id)}
                            aria-label="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
