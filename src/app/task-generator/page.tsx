"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as Switch from "@radix-ui/react-switch";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { ToolActionButton } from "@/components/tools/ToolActionButton";
import { SegmentedControl } from "@/components/tools/SegmentedControl";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
import {
  Sparkles,
  Bug,
  TrendingUp,
  Wrench,
  CheckSquare,
  RefreshCw,
  CircleCheck,
  ListTodo as EmptyIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type TaskType = "feature" | "bug" | "improvement" | "chore";

interface ParsedTask {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS: { id: TaskType; label: string; icon: LucideIcon }[] = [
  { id: "feature", label: "Feature", icon: Sparkles },
  { id: "bug", label: "Bug Fix", icon: Bug },
  { id: "improvement", label: "Improvement", icon: TrendingUp },
  { id: "chore", label: "Chore", icon: Wrench },
];

const TASK_TYPE_META: Record<
  TaskType,
  { label: string; borderClass: string; badgeClass: string; iconClass: string }
> = {
  feature: {
    label: "Feature",
    borderClass: "border-l-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    iconClass: "text-rose-500",
  },
  bug: {
    label: "Bug Fix",
    borderClass: "border-l-red-500",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    iconClass: "text-red-500",
  },
  improvement: {
    label: "Improvement",
    borderClass: "border-l-pink-500",
    badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    iconClass: "text-pink-500",
  },
  chore: {
    label: "Chore",
    borderClass: "border-l-fuchsia-500",
    badgeClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    iconClass: "text-fuchsia-500",
  },
};

const TASK_TYPE_FRAMING: Record<TaskType, string> = {
  feature:
    "This is a new feature request. Describe what needs to be built and the desired end behavior.",
  bug: "This is a bug fix. Describe the broken behavior and what the fixed, correct behavior should be.",
  improvement:
    "This is an improvement to existing functionality. Describe the current gap and what should change.",
  chore:
    "This is a chore (cleanup, config, tooling, maintenance). Describe the work plainly, no user-facing framing needed.",
};

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  taskType: TaskType,
  includeAcceptanceCriteria: boolean,
): string {
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
  const descMatch = raw.match(
    /description:\s*([\s\S]*?)(?=\n\s*acceptance criteria:|$)/i,
  );
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
  const [includeAcceptanceCriteria, setIncludeAcceptanceCriteria] =
    useState(false);
  const { data, loading, error, generate, reset } =
    useGenerate("task-generator");
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

  const task = useMemo(
    () => (data ? parseTaskOutput(data.text) : null),
    [data],
  );
  const hasOutput = !!data?.text;
  const copyText = task ? formatTaskAsText(task) : (data?.text ?? "");
  const meta = TASK_TYPE_META[taskType];

  return (
    <PageShell
      title="Task Generator"
      description="Turn a task title or rough idea into a structured developer task"
      icon="ListTodo"
    >
      <div className="relative h-full overflow-y-auto -m-6 p-6 min-h-0">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {/* Toolbar */}
          <div className="rounded-md border border-border bg-surface-raised flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Type
              </span>
              <SegmentedControl
                options={TASK_TYPE_OPTIONS}
                value={taskType}
                onChange={setTaskType}
                layoutId="tg-type-segment"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <span className="text-xs font-medium text-text-secondary">
                Acceptance criteria
              </span>
              <Switch.Root
                checked={includeAcceptanceCriteria}
                onCheckedChange={setIncludeAcceptanceCriteria}
                className={clsx(
                  "w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0",
                  includeAcceptanceCriteria
                    ? "bg-accent"
                    : "bg-black/10 dark:bg-white/10",
                )}
              >
                <Switch.Thumb
                  className={clsx(
                    "block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    includeAcceptanceCriteria
                      ? "translate-x-4"
                      : "translate-x-0.5",
                  )}
                />
              </Switch.Root>
            </label>
          </div>

          {/* Composer */}
          <div className="rounded-md border border-border bg-surface-raised overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Rough idea
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
              rows={3}
              className="w-full px-5 py-2 text-sm text-text-primary placeholder-text-muted bg-transparent resize-none focus:outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
              <span className="text-xs text-text-muted tabular-nums truncate min-w-0">
                {input.trim() ? `${input.trim().length} chars` : " "}
              </span>
              <ToolActionButton
                onClick={handleGenerate}
                loading={loading}
                disabled={!input.trim() || loading}
                icon={TASK_TYPE_OPTIONS.find((o) => o.id === taskType)?.icon}
              >
                {loading ? "Generating…" : "Generate Task"}
              </ToolActionButton>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger-subtle/60 p-4">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="rounded-md border border-border bg-surface-raised p-6">
              <SkeletonLines lines={6} />
            </div>
          )}

          {/* Empty */}
          {!loading && !hasOutput && !error && (
            <div className="rounded-md border border-border bg-surface-raised flex flex-col items-center justify-center gap-2 text-center px-8 py-14">
              <div className="w-11 h-11 rounded-md border border-border flex items-center justify-center">
                <EmptyIcon
                  className="w-5 h-5 text-accent"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-sm text-text-muted">
                Your structured ticket will appear here
              </p>
              <p className="text-xs text-text-muted/70">
                Pick a type, describe the idea, then Generate
              </p>
            </div>
          )}

          {/* Ticket card */}
          <AnimatePresence initial={false}>
            {!loading && hasOutput && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div
                  className={clsx(
                    "rounded-md border border-border bg-surface-raised overflow-hidden border-l-[4px]",
                    meta.borderClass,
                  )}
                >
                  {/* Ticket header */}
                  <div className="flex items-center justify-between gap-2 px-5 pt-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                          meta.badgeClass,
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
                        <CircleCheck className="w-3 h-3" />
                        Ready to file
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleRegenerate}
                        disabled={loading}
                        className="text-text-muted hover:text-text-primary transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <CopyButton text={copyText} />
                    </div>
                  </div>

                  {task ? (
                    <>
                      <div className="px-5 pt-3 pb-4">
                        <h2 className="text-base font-bold text-text-primary leading-snug">
                          {task.title}
                        </h2>
                        <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {task.description}
                        </p>
                      </div>

                      {task.acceptanceCriteria.length > 0 && (
                        <div className="px-5 pb-4 pt-3 border-t border-border-subtle">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
                            Acceptance Criteria
                          </p>
                          <ul className="flex flex-col gap-2">
                            {task.acceptanceCriteria.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2.5 text-sm text-text-primary leading-relaxed"
                              >
                                <CheckSquare
                                  className={clsx(
                                    "w-4 h-4 mt-0.5 shrink-0",
                                    meta.iconClass,
                                  )}
                                  strokeWidth={1.75}
                                />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <pre className="px-5 py-4 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                      {data!.text}
                    </pre>
                  )}

                  <div className="px-5 py-2.5 border-t border-border-subtle">
                    <ProviderBadge
                      provider={data!.provider}
                      model={data!.model}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}
