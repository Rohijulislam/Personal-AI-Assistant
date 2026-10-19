"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, ListChecks } from "lucide-react";
import { clsx } from "clsx";
import { usePersonalTasks, useTaskClock } from "@/lib/hooks/usePersonalTasks";
import { sortPendingTasks, taskSummary, taskUrgency } from "@/lib/personal-tasks";

function dueLabel(date: string | null, time: string | null) {
  if (!date) return "No deadline";
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day, ...(time ? time.split(":").map(Number) : [0, 0]));
  const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(value);
  return time ? `${label} · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value)}` : label;
}

export function DashboardTaskPanel() {
  const { value: tasks, hydrated } = usePersonalTasks();
  const now = useTaskClock();
  const summary = taskSummary(tasks, now);
  const next = sortPendingTasks(tasks, now).slice(0, 3);
  const urgent = summary.overdue > 0 || summary.today > 0;

  return <section aria-labelledby="dashboard-tasks-heading" className={clsx("overflow-hidden rounded-xl border bg-surface-raised", summary.overdue ? "border-danger/40" : summary.today ? "border-warning/40" : "border-border")}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", summary.overdue ? "bg-danger-subtle text-danger" : summary.today ? "bg-warning-subtle text-warning" : "bg-accent-subtle text-accent")}>{urgent ? <AlertCircle className="h-4.5 w-4.5" aria-hidden="true" /> : <ListChecks className="h-4.5 w-4.5" aria-hidden="true" />}</span>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Personal tasks</p><div className="flex items-center gap-2"><h2 id="dashboard-tasks-heading" className="text-base font-semibold text-text-primary">Your next actions</h2>{hydrated && summary.pending > 0 && <span className="text-xs tabular-nums text-text-muted">{summary.pending} pending</span>}</div></div>
      </div>
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Open task list <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </div>
    {!hydrated ? <div className="px-5 py-5 text-sm text-text-muted sm:px-6">Loading your tasks…</div> : summary.pending === 0 ? <div className="flex items-center gap-3 px-5 py-5 sm:px-6"><CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" /><p className="text-sm text-text-secondary">All clear. Add a task whenever something comes up.</p></div> : <>
      {(urgent || summary.high > 0) && <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3 text-xs sm:px-6">
        {summary.overdue > 0 && <span className="rounded-lg bg-danger-subtle px-2.5 py-1 font-semibold tabular-nums text-danger">{summary.overdue} overdue</span>}
        {summary.today > 0 && <span className="rounded-lg bg-warning-subtle px-2.5 py-1 font-semibold tabular-nums text-warning">{summary.today} due today</span>}
        {summary.high > 0 && <span className="rounded-lg bg-accent-subtle px-2.5 py-1 font-semibold tabular-nums text-accent">{summary.high} high priority</span>}
      </div>}
      <div className="divide-y divide-border-subtle">
        {next.map((task, index) => {
          const urgency = taskUrgency(task, now);
          return <Link key={task.id} href="/tasks" className={clsx("group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken/70 sm:px-6", index === 0 && urgency === "overdue" && "bg-danger-subtle/35", index === 0 && urgency === "today" && "bg-warning-subtle/30")}>
            <span className={clsx("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums", urgency === "overdue" ? "bg-danger-subtle text-danger" : urgency === "today" ? "bg-warning-subtle text-warning" : "bg-surface-sunken text-text-secondary")}>{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{task.title}</span>
            <span className={clsx("hidden shrink-0 items-center gap-1 text-xs sm:inline-flex", urgency === "overdue" ? "font-semibold text-danger" : urgency === "today" ? "font-semibold text-warning" : "text-text-muted")}><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{urgency === "overdue" ? "Overdue" : urgency === "today" ? "Due today" : dueLabel(task.dueDate, task.dueTime)}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>;
        })}
      </div>
    </>}
  </section>;
}
