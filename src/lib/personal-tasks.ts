export type TaskPriority = "high" | "medium" | "low";
export type TaskUrgency = "overdue" | "today" | "upcoming" | "unscheduled";

export interface PersonalTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type TaskDetails = Pick<PersonalTask, "title" | "description" | "priority" | "dueDate" | "dueTime">;

export function createTask(details: TaskDetails, now: Date = new Date(), id: string = crypto.randomUUID()): PersonalTask {
  return { id, ...details, title: details.title.trim(), description: details.description.trim(),
    dueTime: details.dueDate ? details.dueTime : null,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), completedAt: null };
}

export function editTask(task: PersonalTask, details: TaskDetails, now: Date = new Date()): PersonalTask {
  return { ...task, ...details, title: details.title.trim(), description: details.description.trim(),
    dueTime: details.dueDate ? details.dueTime : null, updatedAt: now.toISOString() };
}

export function completeTask(task: PersonalTask, now: Date = new Date()): PersonalTask {
  return { ...task, completedAt: now.toISOString(), updatedAt: now.toISOString() };
}

export function reopenTask(task: PersonalTask, now: Date = new Date()): PersonalTask {
  return { ...task, completedAt: null, updatedAt: now.toISOString() };
}

export function deleteCompletedTask(tasks: PersonalTask[], id: string): PersonalTask[] {
  return tasks.filter((task) => task.id !== id || task.completedAt === null);
}

function localDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskUrgency(task: PersonalTask, now: Date): TaskUrgency {
  if (!task.dueDate) return "unscheduled";
  const today = localDate(now);
  if (task.dueDate < today) return "overdue";
  if (task.dueDate > today) return "upcoming";
  if (task.dueTime) {
    const [hours, minutes] = task.dueTime.split(":").map(Number);
    const deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    if (deadline.getTime() < now.getTime()) return "overdue";
  }
  return "today";
}

/** Changes when a task first becomes due today or crosses into overdue. */
export function urgentTaskSignature(task: PersonalTask, now: Date): string | null {
  if (task.completedAt !== null) return null;
  const urgency = taskUrgency(task, now);
  return urgency === "overdue" || urgency === "today"
    ? `${task.id}:${task.dueDate}:${task.dueTime ?? ""}:${urgency}` : null;
}

const urgencyOrder: Record<TaskUrgency, number> = { overdue: 0, today: 1, upcoming: 2, unscheduled: 3 };
const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export function sortPendingTasks(tasks: PersonalTask[], now: Date): PersonalTask[] {
  return tasks.filter((task) => task.completedAt === null).sort((a, b) => {
    const urgencyA = taskUrgency(a, now);
    const urgencyB = taskUrgency(b, now);
    if (urgencyA !== urgencyB) return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    // Future deadlines stay in chronological order. In the other buckets,
    // priority gives a faster answer to "what should I do next?".
    if (urgencyA === "upcoming") {
      const byDeadline = `${a.dueDate}T${a.dueTime ?? "23:59"}`.localeCompare(`${b.dueDate}T${b.dueTime ?? "23:59"}`);
      if (byDeadline) return byDeadline;
    }
    const byPriority = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (byPriority) return byPriority;
    if (urgencyA === "overdue" || urgencyA === "today") {
      const byDeadline = `${a.dueDate}T${a.dueTime ?? "23:59"}`.localeCompare(`${b.dueDate}T${b.dueTime ?? "23:59"}`);
      if (byDeadline) return byDeadline;
    }
    return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  });
}

export function taskSummary(tasks: PersonalTask[], now: Date) {
  const pending = tasks.filter((task) => task.completedAt === null);
  return {
    pending: pending.length,
    overdue: pending.filter((task) => taskUrgency(task, now) === "overdue").length,
    today: pending.filter((task) => taskUrgency(task, now) === "today").length,
    high: pending.filter((task) => task.priority === "high").length,
  };
}
