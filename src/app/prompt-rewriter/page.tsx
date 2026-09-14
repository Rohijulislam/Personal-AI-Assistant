"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
import { RefreshCw, Sparkles as EmptyIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type TargetModel = "claude" | "chatgpt" | "general";
type PromptStyle = "concise" | "detailed" | "chain-of-thought" | "structured";

interface ModelOption {
  id: TargetModel;
  label: string;
  description: string;
}

interface StyleOption {
  id: PromptStyle;
  label: string;
  description: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "claude",
    label: "Claude",
    description: "Anthropic — prefers rich context and explicit instructions",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    description: "OpenAI — works well with role-based and step-by-step framing",
  },
  {
    id: "general",
    label: "General",
    description: "Any LLM — clean, clear, model-agnostic phrasing",
  },
];

const STYLE_OPTIONS: StyleOption[] = [
  { id: "concise", label: "Concise", description: "Short, direct, no fluff" },
  {
    id: "detailed",
    label: "Detailed",
    description: "Full context with examples",
  },
  {
    id: "chain-of-thought",
    label: "Chain-of-thought",
    description: "Ask the model to reason step-by-step",
  },
  {
    id: "structured",
    label: "Structured",
    description: "Sections, bullets, clear output format",
  },
];

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(model: TargetModel, style: PromptStyle): string {
  const modelGuidance: Record<TargetModel, string> = {
    claude: `The refined prompt is intended for Claude (Anthropic).
- Claude responds best to explicit context, clear goals, and detailed instructions.
- Use <context>, <task>, and <output_format> XML-style tags where helpful.
- Be direct and specific. Claude handles long, thorough prompts well.
- Avoid vague instructions; tell Claude exactly what you want and in what format.`,

    chatgpt: `The refined prompt is intended for ChatGPT (OpenAI).
- ChatGPT responds well to role assignment ("You are a…") at the start.
- Break the task into clear numbered steps when the ask is complex.
- Be explicit about the output format (e.g. "Return a JSON object with keys…").
- Avoid overly long preambles; get to the task quickly after setting the role.`,

    general: `The refined prompt is intended for any LLM.
- Write model-agnostic instructions that work across Claude, ChatGPT, Gemini, etc.
- Be clear, specific, and self-contained — assume no prior context.
- State the goal, any constraints, and the desired output format explicitly.`,
  };

  const styleGuidance: Record<PromptStyle, string> = {
    concise: `Style: Concise.
- Strip everything non-essential.
- One clear ask, no padding, no pleasantries.
- Aim for the fewest words that still convey full intent.`,

    detailed: `Style: Detailed.
- Include relevant background, examples, and edge cases.
- Add a concrete example of the expected output if it helps.
- More context is better here — the model should have everything it needs.`,

    "chain-of-thought": `Style: Chain-of-thought.
- Instruct the model to think step-by-step before giving the final answer.
- Use phrasing like "Think through this carefully before responding" or "Walk through your reasoning first".
- This is especially useful for reasoning, math, code debugging, and multi-step problems.`,

    structured: `Style: Structured.
- Use clear sections with headers or labels (e.g. "## Task", "## Constraints", "## Output format").
- Use bullet points for lists of requirements.
- Specify the exact output structure (e.g. markdown table, JSON, numbered list).`,
  };

  return `You are an expert prompt engineer. Your job is to take a rough, unclear, or poorly-worded prompt and rewrite it into a high-quality prompt that will get the best possible output from an AI model.

${modelGuidance[model]}

${styleGuidance[style]}

Output rules:
- Output ONLY the refined prompt text. No explanation, no preamble, no "Here is the refined prompt:" header.
- Do not wrap the output in quotes or code fences.
- Preserve the user's original intent exactly — you are improving the phrasing, not changing the goal.
- If the original prompt is already good, still clean it up and apply the style.`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PromptRewriterPage() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<TargetModel>("claude");
  const [style, setStyle] = useState<PromptStyle>("detailed");
  const { data, loading, error, generate, reset } = useGenerate("prompt-rewriter");
  const lastOptions = useRef<GenerateOptions | null>(null);

  const runGenerate = async (options: GenerateOptions) => {
    lastOptions.current = options;
    const result = await generate(options);
    if (!result) toast.error("Failed to refine prompt — see details below.");
  };

  const handleRefine = async () => {
    if (!input.trim()) return;
    await runGenerate({
      prompt: input.trim(),
      system: buildSystemPrompt(model, style),
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

  const hasOutput = !!data?.text;

  return (
    <PageShell
      title="Prompt Rewriter"
      description="Improve rough prompts for clearer and better AI output"
      icon="Wand2"
      color="from-amber-500 to-orange-600"
    >
      <div className="h-full flex flex-col lg:flex-row gap-4 -m-6 p-6 min-h-0">
        {/* ── Left: Input + Options ── */}
        <div className="flex flex-col lg:w-[45%] shrink-0 min-h-0 gap-3">
          {/* Target model */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
              Target Model
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setModel(opt.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
                    model === opt.id
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600"
                      : "border-border bg-surface-raised hover:border-text-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      model === opt.id
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-text-primary",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight mt-0.5 line-clamp-2">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
              Style
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStyle(opt.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
                    style === opt.id
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600"
                      : "border-border bg-surface-raised hover:border-text-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      style === opt.id
                        ? "text-amber-700 dark:text-amber-400"
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

          {/* Textarea */}
          <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border bg-surface-raised shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-text-muted">
                Your rough prompt
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
              placeholder="Type or paste the prompt you want to improve…"
              className="flex-1 w-full px-4 py-2 text-sm text-text-primary placeholder-text-muted bg-transparent resize-none focus:outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-sunken/60">
              <span className="text-xs text-text-muted tabular-nums">
                {input.trim() ? `${input.trim().length} chars` : ""}
              </span>
              <Button
                onClick={handleRefine}
                loading={loading}
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm"
              >
                {loading ? "Refining…" : "Refine Prompt"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                Refined Prompt
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hasOutput ? (
                  <>
                    <span className="text-xs text-text-muted">
                      {MODEL_OPTIONS.find((m) => m.id === model)?.label} ·{" "}
                      {STYLE_OPTIONS.find((s) => s.id === style)?.label}
                    </span>
                    <ProviderBadge provider={data.provider} model={data.model} />
                  </>
                ) : (
                  <p className="text-xs text-text-muted">Ready to paste into Claude or ChatGPT</p>
                )}
              </div>
            </div>
            {hasOutput && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={loading}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
                <CopyButton text={data.text} />
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
            {!loading && hasOutput && (
              <div className="h-full flex flex-col overflow-hidden">
                <pre className="flex-1 px-5 py-4 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed overflow-y-auto">
                  {data.text}
                </pre>
              </div>
            )}

            {/* Empty state */}
            {!loading && !hasOutput && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center">
                  <EmptyIcon className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-text-muted">
                  Your refined prompt will appear here
                </p>
                <p className="text-xs text-text-muted/70">
                  Pick a model, pick a style, then hit Refine
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
