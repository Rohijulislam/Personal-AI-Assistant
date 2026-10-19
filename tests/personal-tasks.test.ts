import test from "node:test";
import assert from "node:assert/strict";
import {
  completeTask, createTask, deleteCompletedTask, editTask, reopenTask,
  sortPendingTasks, taskSummary, taskUrgency, type PersonalTask, type TaskDetails,
  urgentTaskSignature,
} from "../src/lib/personal-tasks";

const morning = new Date(2026, 9, 19, 9, 0);
const afternoon = new Date(2026, 9, 19, 15, 0);
const details: TaskDetails = { title: "  Submit report  ", description: "  Include notes  ", priority: "medium", dueDate: null, dueTime: null };

function task(id: string, changes: Partial<PersonalTask> = {}) {
  return { ...createTask(details, morning, id), ...changes };
}

test("create, edit, complete, reopen, and delete a task", () => {
  const created = createTask(details, morning, "one");
  assert.equal(created.title, "Submit report");
  assert.equal(created.description, "Include notes");
  assert.equal(created.dueDate, null);
  assert.equal(created.completedAt, null);
  const edited = editTask(created, { ...details, title: "  Send report ", priority: "high", dueDate: "2026-10-20", dueTime: "13:30" }, afternoon);
  assert.equal(edited.title, "Send report");
  assert.equal(edited.priority, "high");
  assert.equal(edited.dueTime, "13:30");
  assert.equal(edited.createdAt, created.createdAt);
  assert.equal(editTask(edited, details, afternoon).dueTime, null);
  const completed = completeTask(edited, afternoon);
  assert.equal(completed.completedAt, afternoon.toISOString());
  assert.deepEqual(sortPendingTasks([completed], afternoon), []);
  assert.deepEqual(deleteCompletedTask([completed], "one"), []);
  assert.equal(deleteCompletedTask([created], "one").length, 1);
  assert.equal(reopenTask(completed, afternoon).completedAt, null);
});

test("sorts pending tasks by urgency, priority, and upcoming deadline", () => {
  const tasks = [
    task("none-low", { priority: "low" }),
    task("future-later", { priority: "high", dueDate: "2026-10-22" }),
    task("today-low", { priority: "low", dueDate: "2026-10-19" }),
    task("overdue-low", { priority: "low", dueDate: "2026-10-18" }),
    task("future-sooner", { priority: "low", dueDate: "2026-10-20" }),
    task("today-high", { priority: "high", dueDate: "2026-10-19" }),
    task("overdue-high", { priority: "high", dueDate: "2026-10-18" }),
    task("none-high", { priority: "high" }),
    task("done", { dueDate: "2026-10-18", completedAt: afternoon.toISOString() }),
  ];
  assert.deepEqual(sortPendingTasks(tasks, morning).map((item) => item.id), [
    "overdue-high", "overdue-low", "today-high", "today-low",
    "future-sooner", "future-later", "none-high", "none-low",
  ]);
});

test("date-only tasks stay due today; timed tasks become overdue as time passes", () => {
  const dateOnly = task("date-only", { dueDate: "2026-10-19" });
  const timed = task("timed", { dueDate: "2026-10-19", dueTime: "12:00", priority: "high" });
  const completed = completeTask(task("done", { dueDate: "2026-10-18", priority: "high" }), afternoon);
  assert.equal(taskUrgency(dateOnly, afternoon), "today");
  assert.equal(taskUrgency(dateOnly, new Date(2026, 9, 20, 0, 0)), "overdue");
  assert.equal(taskUrgency(timed, morning), "today");
  assert.equal(taskUrgency(timed, afternoon), "overdue");
  assert.deepEqual(taskSummary([dateOnly, timed, completed], morning), { pending: 2, overdue: 0, today: 2, high: 1 });
  assert.deepEqual(taskSummary([dateOnly, timed, completed], afternoon), { pending: 2, overdue: 1, today: 1, high: 1 });
  assert.deepEqual(taskSummary([dateOnly, timed, completed], new Date(2026, 9, 20, 0, 0)), { pending: 2, overdue: 2, today: 0, high: 1 });
});

test("indicator counts follow creation, editing, completion, and deletion", () => {
  const created = createTask({ ...details, priority: "high", dueDate: "2026-10-19", dueTime: "08:00" }, morning, "urgent");
  assert.deepEqual(taskSummary([created], morning), { pending: 1, overdue: 1, today: 0, high: 1 });
  const edited = editTask(created, { ...details, priority: "low", dueDate: null }, afternoon);
  assert.deepEqual(taskSummary([edited], afternoon), { pending: 1, overdue: 0, today: 0, high: 0 });
  const completed = completeTask(created, afternoon);
  assert.deepEqual(taskSummary([completed], afternoon), { pending: 0, overdue: 0, today: 0, high: 0 });
  assert.deepEqual(taskSummary(deleteCompletedTask([completed], "urgent"), afternoon), { pending: 0, overdue: 0, today: 0, high: 0 });
});

test("notification identity changes only when a deadline becomes urgent or expires", () => {
  const timed = task("timed", { dueDate: "2026-10-19", dueTime: "12:00" });
  assert.equal(urgentTaskSignature(timed, new Date(2026, 9, 18, 12, 0)), null);
  assert.equal(urgentTaskSignature(timed, morning), "timed:2026-10-19:12:00:today");
  assert.equal(urgentTaskSignature(timed, afternoon), "timed:2026-10-19:12:00:overdue");
  assert.equal(urgentTaskSignature(completeTask(timed, afternoon), afternoon), null);
});
