"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { ToolActionButton } from "@/components/tools/ToolActionButton";
import { SegmentedControl } from "@/components/tools/SegmentedControl";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  Sparkles,
  Bot,
  Globe2,
  Zap,
  FileText,
  Waypoints,
  ListTree,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type TargetModel = "claude" | "chatgpt" | "general";
type PromptStyle = "concise" | "detailed" | "chain-of-thought" | "structured";

// ── Config ───────────────────────────────────────────────────────────────────

const MODEL_OPTIONS: { id: TargetModel; label: string; icon: LucideIcon }[] = [
  { id: "claude", label: "Claude", icon: Sparkles },
  { id: "chatgpt", label: "ChatGPT", icon: Bot },
  { id: "general", label: "General", icon: Globe2 },
];

const STYLE_OPTIONS: { id: PromptStyle; label: string; icon: LucideIcon }[] = [
  { id: "concise", label: "Concise", icon: Zap },
  { id: "detailed", label: "Detailed", icon: FileText },
  { id: "chain-of-thought", label: "Step-by-step", icon: Waypoints },
  { id: "structured", label: "Structured", icon: ListTree },
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
  const { data, loading, error, generate, reset } =
    useGenerate("prompt-rewriter");
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
    >
      <div className="relative h-full overflow-y-auto -m-6 p-6 min-h-0">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* Toolbar */}
          <div className="rounded-md border border-border bg-surface-raised flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                For
              </span>
              <SegmentedControl
                options={MODEL_OPTIONS}
                value={model}
                onChange={setModel}
                layoutId="pr-model-segment"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Style
              </span>
              <SegmentedControl
                options={STYLE_OPTIONS}
                value={style}
                onChange={setStyle}
                layoutId="pr-style-segment"
              />
            </div>
          </div>

          {/* Transform layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_60px_1fr] gap-4 items-stretch">
            {/* Input */}
            <div className="rounded-md border border-border bg-surface-raised flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Rough prompt
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
                rows={8}
                className="flex-1 w-full px-5 py-2 text-sm text-text-primary placeholder-text-muted bg-transparent resize-none focus:outline-none"
                spellCheck={false}
              />
              <div className="px-5 py-3 text-xs text-text-muted tabular-nums border-t border-border-subtle">
                {input.trim() ? `${input.trim().length} chars` : " "}
              </div>
            </div>

            {/* Transform button */}
            <div className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0">
              <ToolActionButton
                onClick={handleRefine}
                loading={loading}
                disabled={!input.trim() || loading}
                icon={ArrowRight}
                className="rounded-full! p-0! w-14! h-14!"
              >
                <span className="sr-only">Refine Prompt</span>
              </ToolActionButton>
              <span className="text-[10px] font-medium text-text-muted hidden lg:block">
                Refine
              </span>
            </div>

            {/* Output */}
            <div className="rounded-md border border-border bg-surface-raised flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-1 gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Refined prompt
                </span>
                {hasOutput && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleRegenerate}
                      disabled={loading}
                      className="text-text-muted hover:text-text-primary transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <CopyButton text={data.text} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[12rem] px-5 py-2 pb-4">
                {error && <p className="text-xs text-danger">{error}</p>}

                {loading && <SkeletonLines lines={7} />}

                <AnimatePresence initial={false}>
                  {!loading && hasOutput && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MarkdownRenderer text={data.text} className="text-sm" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {!loading && !hasOutput && !error && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-8">
                    <div className="w-10 h-10 rounded-md border border-border flex items-center justify-center">
                      <Sparkles
                        className="w-4.5 h-4.5 text-accent"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm text-text-muted">
                      Ready to paste into Claude or ChatGPT
                    </p>
                  </div>
                )}
              </div>

              {hasOutput && (
                <div className="px-5 py-2.5 border-t border-border-subtle">
                  <ProviderBadge provider={data.provider} model={data.model} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
