"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, Inbox, Pencil, Plus, RotateCcw, Target, Trash2, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePersonalTasks, useTaskClock } from "@/lib/hooks/usePersonalTasks";
import {
  completeTask, createTask, deleteCompletedTask, editTask, reopenTask,
  sortPendingTasks, taskSummary, taskUrgency,
  type PersonalTask, type TaskDetails, type TaskPriority, type TaskUrgency,
} from "@/lib/personal-tasks";

type StatusFilter = "pending" | "completed";
type PriorityFilter = "all" | TaskPriority;
const emptyDetails: TaskDetails = { title: "", description: "", priority: "medium", dueDate: null, dueTime: null };
const inputClass = "w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20";
const sections: { urgency: TaskUrgency; label: string; note: string; icon: LucideIcon }[] = [
  { urgency: "overdue", label: "Overdue", note: "Needs attention", icon: AlertCircle },
  { urgency: "today", label: "Due today", note: "On your plate", icon: Clock3 },
  { urgency: "upcoming", label: "Upcoming", note: "Scheduled ahead", icon: CalendarDays },
  { urgency: "unscheduled", label: "Anytime", note: "No deadline", icon: Inbox },
];

function formatDate(date: string, time?: string | null) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day, ...(time ? time.split(":").map(Number) : [0, 0]));
  const dateLabel = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(value);
  return time ? `${dateLabel} · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value)}` : dateLabel;
}

function TaskForm({ initial = emptyDetails, onSave, onCancel, submitLabel }: {
  initial?: TaskDetails;
  onSave: (details: TaskDetails) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [details, setDetails] = useState<TaskDetails>(initial);
  const [expanded, setExpanded] = useState(Boolean(onCancel));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details.title.trim()) return;
    onSave(details);
    if (!onCancel) { setDetails(emptyDetails); setExpanded(false); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1"><span className="sr-only">Task title</span>
        <input className={inputClass} value={details.title} onChange={(event) => setDetails({ ...details, title: event.target.value })} placeholder="What do you need to do?" maxLength={200} required autoFocus={Boolean(onCancel)} />
      </label>
      <div className="flex gap-2">
        <label className="min-w-0 flex-1 sm:w-32 sm:flex-none"><span className="sr-only">Priority</span>
          <select className={inputClass} value={details.priority} onChange={(event) => setDetails({ ...details, priority: event.target.value as TaskPriority })}><option value="high">High priority</option><option value="medium">Medium</option><option value="low">Low priority</option></select>
        </label>
        <Button type="submit" className="shrink-0"><Plus className="h-4 w-4" aria-hidden="true" />{submitLabel}</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-text-secondary hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
        {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        {expanded ? "Hide details" : details.dueDate ? `Due ${formatDate(details.dueDate, details.dueTime)} · Edit details` : "Add a deadline or note"}
      </button>
      {onCancel && <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent">Cancel</button>}
    </div>
    {expanded && <div className="grid gap-3 border-t border-border-subtle pt-3 sm:grid-cols-2">
      <label className="text-xs font-medium text-text-secondary">Due date
        <input className={clsx(inputClass, "mt-1.5")} type="date" value={details.dueDate ?? ""} onChange={(event) => setDetails({ ...details, dueDate: event.target.value || null, dueTime: event.target.value ? details.dueTime : null })} />
      </label>
      <label className="text-xs font-medium text-text-secondary">Time <span className="font-normal text-text-muted">(optional)</span>
        <input className={clsx(inputClass, "mt-1.5 disabled:cursor-not-allowed disabled:opacity-50")} type="time" value={details.dueTime ?? ""} disabled={!details.dueDate} onChange={(event) => setDetails({ ...details, dueTime: event.target.value || null })} />
      </label>
      <label className="text-xs font-medium text-text-secondary sm:col-span-2">Note <span className="font-normal text-text-muted">(optional)</span>
        <textarea className={clsx(inputClass, "mt-1.5 min-h-20 resize-y")} value={details.description} onChange={(event) => setDetails({ ...details, description: event.target.value })} placeholder="Anything useful to remember" rows={2} />
      </label>
    </div>}
  </form>;
}

function TaskRow({ task, now, onEdit, onComplete, onReopen, onDelete }: {
  task: PersonalTask; now: Date;
  onEdit: (details: TaskDetails) => void;
  onComplete: () => void; onReopen: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const urgency = taskUrgency(task, now);
  const completed = task.completedAt !== null;
  const priorityColor = task.priority === "high" ? "bg-danger" : task.priority === "medium" ? "bg-warning" : "bg-text-muted";
  return <div className={clsx("group relative border-b border-border-subtle last:border-b-0 transition-colors hover:bg-surface-sunken/40", !completed && urgency === "overdue" && "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-danger", !completed && urgency === "today" && "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-warning")}>
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_7.5rem_5.5rem_2rem] sm:items-center sm:gap-x-4 sm:px-5">
      <button type="button" onClick={completed ? onReopen : onComplete} className={clsx("mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mt-0", completed ? "border-success bg-success text-white" : "border-border bg-surface-raised hover:border-success hover:text-success")} aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`} title={completed ? "Reopen task" : "Mark completed"}>
        {completed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <div className="min-w-0">
        <h5 className={clsx("break-words text-sm font-semibold leading-5 text-text-primary", completed && "text-text-muted line-through")}>{task.title}</h5>
        {task.description && <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-text-secondary">{task.description}</p>}
        <p className="mt-1.5 text-[11px] tabular-nums text-text-muted">Created {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(task.createdAt))}{completed && ` · Completed ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(task.completedAt!))}`}</p>
      </div>
      <div className={clsx("col-start-2 flex items-center gap-1.5 text-xs tabular-nums sm:col-start-3", !completed && urgency === "overdue" ? "font-semibold text-danger" : !completed && urgency === "today" ? "font-semibold text-warning" : "text-text-secondary")}>
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{task.dueDate ? formatDate(task.dueDate, task.dueTime) : "No deadline"}</span>
      </div>
      <span className="col-start-2 row-start-3 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary sm:col-start-4 sm:row-start-1"><span className={clsx("h-1.5 w-1.5 rounded-full", priorityColor)} />{task.priority[0].toUpperCase() + task.priority.slice(1)}</span>
      {!editing && <div className="col-start-3 row-span-3 row-start-1 flex items-start gap-1 sm:col-start-5 sm:row-span-1 sm:items-center">
        {!completed && <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${task.title}`} title="Edit task" className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"><Pencil className="h-4 w-4" aria-hidden="true" /></button>}
        {completed && <><button type="button" onClick={onReopen} aria-label={`Reopen ${task.title}`} title="Reopen task" className="rounded-lg p-1.5 text-text-muted hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={onDelete} aria-label={`Delete ${task.title}`} title="Delete task" className="rounded-lg p-1.5 text-text-muted hover:bg-danger-subtle hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></>}
      </div>}
    </div>
    {editing && <div className="border-t border-border-subtle bg-surface-raised px-4 py-4 sm:px-5"><TaskForm initial={task} submitLabel="Save" onCancel={() => setEditing(false)} onSave={(details) => { onEdit(details); setEditing(false); }} /></div>}
  </div>;
}

export default function PersonalTasksPage() {
  const { value: tasks, setValue: setTasks, hydrated } = usePersonalTasks();
  const now = useTaskClock();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const summary = taskSummary(tasks, now);
  const pending = sortPendingTasks(tasks, now);
  const completed = tasks.filter((task) => task.completedAt !== null).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const visible = (status === "pending" ? pending : completed).filter((task) => priority === "all" || task.priority === priority);
  const grouped = sections.map((section) => ({ ...section, tasks: visible.filter((task) => taskUrgency(task, now) === section.urgency) })).filter((section) => section.tasks.length > 0);
  const nextTask = pending[0];
  const nextUrgency = nextTask ? taskUrgency(nextTask, now) : null;
  const upcomingCount = pending.filter((task) => taskUrgency(task, now) === "upcoming").length;
  const unscheduledCount = pending.filter((task) => taskUrgency(task, now) === "unscheduled").length;
  const updateTask = (id: string, update: (task: PersonalTask) => PersonalTask) => setTasks((current) => current.map((task) => task.id === id ? update(task) : task));
  const renderRow = (task: PersonalTask) => <TaskRow key={task.id} task={task} now={now}
    onEdit={(details) => updateTask(task.id, (item) => editTask(item, details))}
    onComplete={() => updateTask(task.id, (item) => completeTask(item))}
    onReopen={() => updateTask(task.id, (item) => reopenTask(item))}
    onDelete={() => setTasks((current) => deleteCompletedTask(current, task.id))} />;

  return <PageShell title="Personal Tasks" description="Your next actions, clearly in view" icon="ListChecks">
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Your action list</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-text-primary">What needs attention</h2></div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {summary.overdue > 0 && <span className="inline-flex items-center gap-1.5 rounded-lg bg-danger-subtle px-2.5 py-1.5 font-semibold text-danger"><AlertCircle className="h-3.5 w-3.5" />{summary.overdue} overdue</span>}
          {summary.today > 0 && <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning-subtle px-2.5 py-1.5 font-semibold text-warning"><Clock3 className="h-3.5 w-3.5" />{summary.today} due today</span>}
          <span className="rounded-lg bg-surface-sunken px-2.5 py-1.5 font-medium text-text-secondary">{hydrated ? summary.pending : "—"} pending</span>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-accent" aria-hidden="true" /><h3 className="text-sm font-semibold text-text-primary">Quick capture</h3></div>
        <TaskForm submitLabel="Add task" onSave={(details) => setTasks((current) => [...current, createTask(details)])} />
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <section aria-label="Task list" className="min-w-0">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div><h3 className="text-base font-semibold text-text-primary">Task queue</h3><p className="mt-0.5 text-xs text-text-muted">{status === "pending" ? "Sorted by urgency, then priority" : "Most recently completed first"}</p></div>
              <span className="rounded-lg bg-surface-sunken px-2.5 py-1 text-xs font-medium tabular-nums text-text-secondary">{hydrated ? visible.length : "—"} shown</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border-subtle bg-surface-sunken/25 px-4 py-2.5 sm:px-5">
              <div className="flex gap-1" role="group" aria-label="Task status">
                {(["pending", "completed"] as const).map((option) => <button key={option} type="button" onClick={() => setStatus(option)} aria-pressed={status === option} className={clsx("rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent", status === option ? "bg-surface-raised text-text-primary shadow-sm" : "text-text-muted hover:bg-surface-raised/60 hover:text-text-primary")}>{option === "pending" ? `Pending · ${hydrated ? summary.pending : "—"}` : `Completed · ${hydrated ? completed.length : "—"}`}</button>)}
              </div>
              <label className="flex items-center gap-2 text-xs text-text-muted">Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-accent"><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
              </label>
            </div>
            {!hydrated ? <div className="px-5 py-12 text-sm text-text-muted">Loading tasks…</div> : visible.length === 0 ? <div className="flex flex-col items-center px-5 py-14 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-sunken text-text-muted"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span><p className="mt-3 text-sm font-semibold text-text-primary">{priority !== "all" ? `No ${priority}-priority ${status} tasks` : status === "pending" ? "Nothing pending" : "No completed tasks"}</p><p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">{priority !== "all" ? "Try another priority or choose All priorities." : status === "pending" ? "Add your next action above. It will stay here until you complete it." : "Finished work will appear here."}</p></div> : status === "completed" ? <div>{visible.map(renderRow)}</div> : grouped.map((section) => {
              const Icon = section.icon;
              return <div key={section.urgency}>
                <div className={clsx("flex items-center gap-3 border-b border-border-subtle px-4 py-3 sm:px-5", section.urgency === "overdue" ? "bg-danger-subtle/45" : section.urgency === "today" ? "bg-warning-subtle/40" : "bg-surface-sunken/35")}>
                  <span className={clsx("flex h-7 w-7 items-center justify-center rounded-lg", section.urgency === "overdue" ? "bg-danger-subtle text-danger" : section.urgency === "today" ? "bg-warning-subtle text-warning" : "bg-surface-raised text-text-secondary")}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0"><h4 className="text-xs font-semibold text-text-primary">{section.label}</h4><p className="text-[11px] text-text-muted">{section.note}</p></div>
                  <span className="ml-auto rounded-md bg-surface-raised px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">{section.tasks.length}</span>
                </div>
                <div>{section.tasks.map(renderRow)}</div>
              </div>;
            })}
          </Card>
        </section>

        <aside className="hidden space-y-4 xl:block" aria-label="Task overview">
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle px-5 py-4"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" aria-hidden="true" /><h3 className="text-sm font-semibold text-text-primary">Focus next</h3></div><p className="mt-1 text-xs text-text-muted">Your highest-ranked pending action</p></div>
            <div className="p-5">
              {!hydrated ? <p className="text-sm text-text-muted">Loading…</p> : nextTask ? <>
                <span className={clsx("inline-flex rounded-lg px-2 py-1 text-[11px] font-semibold", nextUrgency === "overdue" ? "bg-danger-subtle text-danger" : nextUrgency === "today" ? "bg-warning-subtle text-warning" : "bg-accent-subtle text-accent")}>{nextUrgency === "overdue" ? "Overdue" : nextUrgency === "today" ? "Due today" : nextUrgency === "upcoming" ? "Upcoming" : "Ready when you are"}</span>
                <p className="mt-3 break-words text-base font-semibold leading-6 text-text-primary">{nextTask.title}</p>
                {nextTask.description && <p className="mt-1.5 line-clamp-3 break-words text-xs leading-5 text-text-secondary">{nextTask.description}</p>}
                <div className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-xs text-text-secondary"><p className="flex items-center justify-between gap-2"><span>Priority</span><span className="font-semibold capitalize text-text-primary">{nextTask.priority}</span></p><p className="flex items-center justify-between gap-2"><span>Deadline</span><span className="text-right font-medium text-text-primary">{nextTask.dueDate ? formatDate(nextTask.dueDate, nextTask.dueTime) : "None set"}</span></p></div>
                <Button type="button" size="sm" className="mt-5 w-full" onClick={() => updateTask(nextTask.id, (item) => completeTask(item))}><Check className="h-4 w-4" aria-hidden="true" />Mark complete</Button>
              </> : <><p className="text-sm font-medium text-text-primary">Your list is clear.</p><p className="mt-1 text-xs leading-5 text-text-muted">Add a task above when something comes up.</p></>}
            </div>
          </Card>
          <Card className="p-5"><h3 className="text-sm font-semibold text-text-primary">At a glance</h3><div className="mt-4 space-y-3 text-xs">
            {[["Overdue", summary.overdue, "bg-danger"], ["Due today", summary.today, "bg-warning"], ["Upcoming", upcomingCount, "bg-accent"], ["Anytime", unscheduledCount, "bg-text-muted"]].map(([label, count, color]) => <div key={label} className="flex items-center gap-2.5"><span className={clsx("h-2 w-2 rounded-full", color)} /><span className="flex-1 text-text-secondary">{label}</span><span className="font-semibold tabular-nums text-text-primary">{hydrated ? count : "—"}</span></div>)}
          </div></Card>
        </aside>
      </div>
    </div>
  </PageShell>;
}
