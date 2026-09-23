"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
import { RefreshCw, ClipboardList as EmptyIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a daily standup formatter. The user will give you raw bullet points or notes grouped into sections. Your job is to output a formatted daily status update.

Rules:
- Output ONLY the formatted status text — no explanation, no markdown fences, no extra commentary.
- The format must be exactly:

Daily Status

Worked on MM/DD/YYYY:

 - <item>

Impediment: none

Planned for MM/DD/YYYY:

 - <item>

Section header recognition (all case-insensitive):
- "today", "t" → today's date (the "Planned for" date)
- "yesterday", "y" → yesterday's date
- An explicit date like "09/10/2026", "9/10/26", "Sep 10", "10th" → treat as that literal date
- "worked on", "done", "completed" → same as yesterday
- "planned", "planned for", "tomorrow" → same as today

Multiple worked-on dates:
- The user may provide more than one past-date section (e.g. they were off Friday and are catching up Monday).
- Each past-date section becomes its own "Worked on MM/DD/YYYY:" block, in chronological order.
- There is still only one "Planned for" block (today).

Output structure:
- If only a "today/planned" section is given → output only the "Planned for" block (omit "Worked on").
- If only past-date sections are given → output only the "Worked on" block(s) (omit "Planned for").
- If both are given → output all "Worked on" blocks first, then "Impediment: none", then "Planned for".
- Always include "Impediment: none" between the last "Worked on" block and "Planned for" when both are present.

Text cleanup rules:
- Fix obvious typos, capitalisation, and grammar in the items.
- Keep task IDs (e.g. T47193, D4090) exactly as-is.
- Keep "(Continue)" annotations exactly as-is.
- Keep parenthetical class/file names exactly as-is.
- Preserve the em dash (—) in task titles.
- Each bullet must start with " - " (one space, dash, one space).
- Do not add or remove bullet points — keep the same number of items the user gave you.`;

function formatDateMDY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

const PLACEHOLDER = `y
T47193 (Continue) [Chat Module] implement unit tests for phase 3
Update the diff D4090 with unit testing changes

09/11/2026
T47120 [Chat Module] implement unit tests for phase 4

t
T47120 (Continue) [Chat Module] implement unit tests for phase 4`;

export default function DailyStatusPage() {
  const [input, setInput] = useState("");
  const { data, loading, error, generate, reset } = useGenerate("daily-status");
  const lastOptions = useRef<GenerateOptions | null>(null);

  const runGenerate = async (options: GenerateOptions) => {
    lastOptions.current = options;
    const result = await generate(options);
    if (!result) toast.error("Failed to format status — see details below.");
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const contextualPrompt = `Today is ${dayNames[today.getDay()]} ${formatDateMDY(today)}. Yesterday was ${dayNames[yesterday.getDay()]} ${formatDateMDY(yesterday)}.

Raw input:
${input.trim()}`;
    await runGenerate({
      prompt: contextualPrompt,
      system: SYSTEM_PROMPT,
      temperature: 0.2,
    });
  };

  const handleRegenerate = async () => {
    if (lastOptions.current) await runGenerate(lastOptions.current);
  };

  const handleClear = () => {
    setInput("");
    reset();
  };

  const hasOutput = !!data?.text;

  return (
    <PageShell
      title="Daily Status"
      description="Convert raw updates into your predefined exact format"
      icon="ClipboardList"
    >
      <div className="relative h-full flex flex-col md:flex-row gap-4 -m-6 p-6 min-h-0">
        {/* ── Left: Input ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Raw Notes
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Use{" "}
                <kbd className="px-1 py-0.5 rounded bg-surface-sunken font-mono text-[10px]">
                  y
                </kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 rounded bg-surface-sunken font-mono text-[10px]">
                  yesterday
                </kbd>{" "}
                for past work,{" "}
                <kbd className="px-1 py-0.5 rounded bg-surface-sunken font-mono text-[10px]">
                  t
                </kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 rounded bg-surface-sunken font-mono text-[10px]">
                  today
                </kbd>{" "}
                for planned, or an explicit date like{" "}
                <kbd className="px-1 py-0.5 rounded bg-surface-sunken font-mono text-[10px]">
                  09/10/2026
                </kbd>
                .
              </p>
            </div>
            {input && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Textarea card */}
          <div
            className={clsx(
              "flex-1 flex flex-col min-h-0 rounded-md border border-border bg-surface-raised overflow-hidden transition-colors duration-200",
              "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/50",
            )}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER}
              className="flex-1 w-full px-4 py-3.5 text-xs font-mono text-text-primary placeholder-text-muted bg-transparent resize-none focus:outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-sunken/60">
              <span className="text-xs text-text-muted tabular-nums truncate min-w-0">
                {input.trim() ? `${input.trim().split("\n").length} lines` : ""}
              </span>
              <Button
                onClick={handleGenerate}
                loading={loading}
                disabled={!input.trim() || loading}
                size="sm"
                className="shrink-0"
              >
                {loading ? "Formatting…" : "Format Status"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                Formatted Status
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hasOutput ? (
                  <ProviderBadge
                    provider={data!.provider}
                    model={data!.model}
                  />
                ) : (
                  <p className="text-xs text-text-muted">
                    Output will appear here
                  </p>
                )}
              </div>
            </div>
            {hasOutput && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
                <CopyButton text={data!.text} />
              </div>
            )}
          </div>

          <div
            className={clsx(
              "relative flex-1 min-h-0 rounded-md border overflow-hidden",
              hasOutput
                ? "border-border bg-surface-raised"
                : "border-dashed border-border bg-surface-sunken/50",
            )}
          >
            {/* Error state */}
            {error && (
              <div className="flex items-start gap-2.5 m-4 p-3 rounded-md bg-danger-subtle border border-danger/30">
                <span className="text-danger text-xs font-medium mt-0.5 shrink-0">
                  Error
                </span>
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="h-full p-5">
                <div className="flex items-center gap-2 mb-4 text-xs font-medium text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Thinking…
                </div>
                <SkeletonLines lines={6} />
              </div>
            )}

            {/* Output text */}
            <AnimatePresence initial={false}>
              {!loading && hasOutput && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full overflow-y-auto"
                >
                  <div className="px-5 py-4 text-sm text-text-primary">
                    <MarkdownRenderer text={data!.text} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!loading && !hasOutput && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                <div className="w-11 h-11 rounded-md border border-border flex items-center justify-center">
                  <EmptyIcon
                    className="w-5 h-5 text-accent"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-sm text-text-muted">
                  Paste your notes and click Format Status
                </p>
                <p className="text-xs text-text-muted/70">
                  Typos will be fixed automatically
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
