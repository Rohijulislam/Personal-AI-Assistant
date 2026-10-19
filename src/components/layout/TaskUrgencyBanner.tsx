"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePersonalTasks, useTaskClock } from "@/lib/hooks/usePersonalTasks";
import { taskSummary, urgentTaskSignature } from "@/lib/personal-tasks";

const ALERTS_KEY = "assistant:task-urgency-alerts";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function TaskUrgencyBanner() {
  const { value: tasks, hydrated } = usePersonalTasks();
  const now = useTaskClock();
  const seen = useRef<Set<string> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || document.hidden) return;
    if (!seen.current) {
      try { seen.current = new Set<string>(JSON.parse(sessionStorage.getItem(ALERTS_KEY) ?? "[]")); }
      catch { seen.current = new Set<string>(); }
    }
    const signatures = tasks.map((task) => urgentTaskSignature(task, now)).filter((value): value is string => value !== null);
    const fresh = signatures.filter((signature) => !seen.current!.has(signature));
    seen.current = new Set(signatures);
    try { sessionStorage.setItem(ALERTS_KEY, JSON.stringify(signatures)); }
    catch { /* In-memory tracking still avoids repeat alerts this visit. */ }
    if (fresh.length === 0) return;
    const newOverdue = fresh.some((signature) => signature.endsWith(":overdue"));
    const summary = taskSummary(tasks, now);
    const count = newOverdue ? summary.overdue : summary.today;
    toast.warning(newOverdue ? countLabel(count, "task overdue", "tasks overdue") : countLabel(count, "task due today", "tasks due today"), {
      description: "Your personal task list has work that needs attention.",
      action: { label: "View tasks", onClick: () => router.push("/tasks") },
      duration: 8000,
    });
  }, [tasks, hydrated, now, router]);

  if (!hydrated) return null;
  const summary = taskSummary(tasks, now);
  if (!summary.overdue && !summary.today) return null;

  return <Link href="/tasks" className={`group flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-sm transition-colors sm:px-8 ${summary.overdue ? "border-danger/30 bg-danger-subtle/70 hover:bg-danger-subtle" : "border-warning/30 bg-warning-subtle/70 hover:bg-warning-subtle"}`}>
    <AlertCircle className={`h-4 w-4 shrink-0 ${summary.overdue ? "text-danger" : "text-warning"}`} aria-hidden="true" />
    <span className={`font-semibold ${summary.overdue ? "text-danger" : "text-warning"}`}>
      {summary.overdue ? countLabel(summary.overdue, "task overdue", "tasks overdue") : countLabel(summary.today, "task due today", "tasks due today")}
    </span>
    {summary.overdue > 0 && summary.today > 0 && <span className="text-text-secondary">{countLabel(summary.today, "due today", "due today")}</span>}
    {summary.high > 0 && <span className="text-text-secondary">{countLabel(summary.high, "high-priority task pending", "high-priority tasks pending")}</span>}
    <span className="ml-auto inline-flex items-center gap-1 font-medium text-text-primary">View tasks <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
  </Link>;
}
