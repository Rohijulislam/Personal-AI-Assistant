"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
import { RefreshCw, ListTodo as EmptyIcon, CheckSquare } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type TaskType = "feature" | "bug" | "improvement" | "chore";

interface TaskTypeOption {
  id: TaskType;
  label: string;
  description: string;
}

interface ParsedTask {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  { id: "feature", label: "Feature", description: "New functionality" },
  { id: "bug", label: "Bug Fix", description: "Something is broken" },
  { id: "improvement", label: "Improvement", description: "Enhance existing behavior" },
  { id: "chore", label: "Chore", description: "Cleanup, config, maintenance" },
];

const TASK_TYPE_FRAMING: Record<TaskType, string> = {
  feature: "This is a new feature request. Describe what needs to be built and the desired end behavior.",
  bug: "This is a bug fix. Describe the broken behavior and what the fixed, correct behavior should be.",
  improvement: "This is an improvement to existing functionality. Describe the current gap and what should change.",
  chore: "This is a chore (cleanup, config, tooling, maintenance). Describe the work plainly, no user-facing framing needed.",
};

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(taskType: TaskType, includeAcceptanceCriteria: boolean): string {
  return `You are an expert engineering lead. Your job is to take a rough, informal task idea (often with typos or shorthand) from a developer and turn it into a clean, structured developer task ready to paste into a ticket tracker (e.g. Jira, Linear).

${TASK_TYPE_FRAMING[taskType]}

Output rules:
- Correct typos and grammar. Interpret shorthand and abbreviations sensibly.
- Preserve the user's original intent and scope exactly — do not invent unrelated requirements or expand scope.
- Output in EXACTLY this format, with these exact section headers, nothing before or after:

TITLE: <a short, clear, title-case task title, under 12 words>
DESCRIPTION: <2-4 sentences describing what needs to be done, why, and what "done" looks like. Plain prose, no bullet points.>${
    includeAcceptanceCriteria
      ? `
ACCEPTANCE CRITERIA:
- <first concrete, testable condition for this task to be considered complete>
- <second condition>
- <add 2-5 total, only as many as are clearly implied by the input>`
      : ""
  }

- Do not add extra sections, headers, labels, or commentary beyond what's specified above.
- Do not wrap the output in quotes or code fences.`;
}

function parseTaskOutput(raw: string): ParsedTask | null {
  const titleMatch = raw.match(/title:\s*([\s\S]*?)(?=\n\s*description:|$)/i);
  const descMatch = raw.match(/description:\s*([\s\S]*?)(?=\n\s*acceptance criteria:|$)/i);
  const acMatch = raw.match(/acceptance criteria:\s*([\s\S]*)$/i);

  const title = titleMatch?.[1]?.trim();
  const description = descMatch?.[1]?.trim();

  if (!title || !description) return null;

  const acceptanceCriteria = acMatch
    ? acMatch[1]
        .split("\n")
        .map((line) => line.replace(/^[\s*-]+/, "").trim())
        .filter(Boolean)
    : [];

  return { title, description, acceptanceCriteria };
}

function formatTaskAsText(task: ParsedTask): string {
  let out = `Title\n${task.title}\n\nDescription\n${task.description}`;
  if (task.acceptanceCriteria.length > 0) {
    out += `\n\nAcceptance Criteria\n${task.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`;
  }
  return out;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TaskGeneratorPage() {
  const [input, setInput] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("feature");
  const [includeAcceptanceCriteria, setIncludeAcceptanceCriteria] = useState(false);
  const { data, loading, error, generate, reset } = useGenerate("task-generator");
  const lastOptions = useRef<GenerateOptions | null>(null);

  const runGenerate = async (options: GenerateOptions) => {
    lastOptions.current = options;
    const result = await generate(options);
    if (!result) toast.error("Failed to generate task — see details below.");
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    await runGenerate({
      prompt: input.trim(),
      system: buildSystemPrompt(taskType, includeAcceptanceCriteria),
      temperature: 0.4,
    });
  };

  const handleRegenerate = async () => {
    if (lastOptions.current) await runGenerate(lastOptions.current);
  };

  const handleClear = () => {
    setInput("");
    reset();
  };

  const task = useMemo(() => (data ? parseTaskOutput(data.text) : null), [data]);
  const hasOutput = !!data?.text;
  const copyText = task ? formatTaskAsText(task) : (data?.text ?? "");

  return (
    <PageShell
      title="Task Generator"
      description="Turn a task title or rough idea into a structured developer task"
      icon="ListTodo"
      color="from-rose-500 to-pink-600"
    >
      <div className="h-full flex flex-col lg:flex-row gap-4 -m-6 p-6 min-h-0">
        {/* ── Left: Input + Options ── */}
        <div className="flex flex-col lg:w-[45%] shrink-0 min-h-0 gap-3">
          {/* Task type */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
              Task Type
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {TASK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTaskType(opt.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
                    taskType === opt.id
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-600"
                      : "border-border bg-surface-raised hover:border-text-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      taskType === opt.id
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-text-primary",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight mt-0.5">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Acceptance criteria toggle */}
          <button
            onClick={() => setIncludeAcceptanceCriteria((v) => !v)}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
              includeAcceptanceCriteria
                ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-600"
                : "border-border bg-surface-raised hover:border-text-muted",
            )}
          >
            <CheckSquare
              className={clsx(
                "w-4 h-4 shrink-0",
                includeAcceptanceCriteria ? "text-rose-600 dark:text-rose-400" : "text-text-muted",
              )}
              strokeWidth={1.75}
            />
            <span className="flex flex-col">
              <span
                className={clsx(
                  "text-sm font-medium",
                  includeAcceptanceCriteria
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-text-primary",
                )}
              >
                Include acceptance criteria
              </span>
              <span className="text-[10px] text-text-muted leading-tight">
                Add a checklist of testable conditions for &ldquo;done&rdquo;
              </span>
            </span>
          </button>

          {/* Textarea */}
          <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border bg-surface-raised shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-text-muted">
                Your rough task idea
              </span>
              {input && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. update call list UI & implement call transfer flow following figma design"
              className="flex-1 w-full px-4 py-2 text-sm text-text-primary placeholder-text-muted bg-transparent resize-none focus:outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-sunken/60">
              <span className="text-xs text-text-muted tabular-nums">
                {input.trim() ? `${input.trim().length} chars` : ""}
              </span>
              <Button
                onClick={handleGenerate}
                loading={loading}
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-sm"
              >
                {loading ? "Generating…" : "Generate Task"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                Structured Task
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hasOutput ? (
                  <>
                    <span className="text-xs text-text-muted">
                      {TASK_TYPE_OPTIONS.find((t) => t.id === taskType)?.label}
                    </span>
                    <ProviderBadge provider={data.provider} model={data.model} />
                  </>
                ) : (
                  <p className="text-xs text-text-muted">Ready to paste into your tracker</p>
                )}
              </div>
            </div>
            {hasOutput && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={loading}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
                <CopyButton text={copyText} />
              </div>
            )}
          </div>

          <div
            className={clsx(
              "flex-1 min-h-0 rounded-xl border shadow-sm overflow-hidden",
              hasOutput
                ? "border-border bg-surface-raised"
                : "border-dashed border-border bg-surface-sunken/50",
            )}
          >
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 m-4 p-3 rounded-lg bg-danger-subtle border border-danger/30">
                <span className="text-danger text-xs font-medium mt-0.5 shrink-0">
                  Error
                </span>
                <p className="text-xs text-danger">
                  {error}
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && <SkeletonLines lines={8} className="p-5" />}

            {/* Output */}
            {!loading && hasOutput && task && (
              <div className="h-full flex flex-col overflow-y-auto">
                <div className="px-5 py-4 border-b border-border-subtle">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Title
                    </span>
                    <CopyButton text={task.title} />
                  </div>
                  <p className="text-sm font-semibold text-text-primary leading-snug">
                    {task.title}
                  </p>
                </div>
                <div
                  className={clsx(
                    "px-5 py-4",
                    task.acceptanceCriteria.length > 0 && "border-b border-border-subtle",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Description
                    </span>
                    <CopyButton text={task.description} />
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
                {task.acceptanceCriteria.length > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Acceptance Criteria
                      </span>
                      <CopyButton
                        text={task.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}
                      />
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {task.acceptanceCriteria.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-text-primary leading-relaxed"
                        >
                          <CheckSquare
                            className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0"
                            strokeWidth={1.75}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Fallback: output didn't match expected format */}
            {!loading && hasOutput && !task && (
              <pre className="h-full px-5 py-4 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed overflow-y-auto">
                {data.text}
              </pre>
            )}

            {/* Empty state */}
            {!loading && !hasOutput && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center">
                  <EmptyIcon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-text-muted">
                  Your structured task will appear here
                </p>
                <p className="text-xs text-text-muted/70">
                  Pick a task type, describe the idea, then hit Generate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
