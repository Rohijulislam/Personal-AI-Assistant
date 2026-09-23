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
  Users,
  UserCog,
  UsersRound,
  Briefcase,
  MessageCircleMore,
  Scissors,
  Heart,
  RefreshCw,
  Sparkles,
  PenLine as EmptyIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type Audience = "client" | "manager" | "team";
type Tone = "professional" | "explain" | "clean" | "humanized";

// ── Config ───────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: { id: Audience; label: string; icon: LucideIcon }[] = [
  { id: "client", label: "Client", icon: Briefcase },
  { id: "manager", label: "Manager", icon: UserCog },
  { id: "team", label: "Team", icon: UsersRound },
];

const TONE_OPTIONS: { id: Tone; label: string; icon: LucideIcon }[] = [
  { id: "professional", label: "Professional", icon: Users },
  { id: "explain", label: "Explain & Detail", icon: MessageCircleMore },
  { id: "clean", label: "Clean & Production", icon: Scissors },
  { id: "humanized", label: "Humanized", icon: Heart },
];

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(audience: Audience, tone: Tone): string {
  const audienceGuidance: Record<Audience, string> = {
    client: `Audience: External client.
- Use polished, professional language. No internal jargon or technical slang.
- Be respectful of their time — get to the point without being abrupt.
- Frame issues positively where possible (e.g. "we identified" not "we messed up").
- Never expose internal team friction, blame, or uncertainty to the client.`,

    manager: `Audience: Manager or leadership.
- Be direct and outcome-oriented. Lead with the key point, then give context.
- Use clear, confident language. Avoid hedging or excessive qualifiers.
- Mention impact, status, and next steps where relevant.
- Internal tone is fine — no need for formal salutations.`,

    team: `Audience: Team members / peers.
- Casual but precise. Write how a senior engineer would talk to their team.
- Skip formalities. Get to the point.
- It's fine to be direct, even blunt, as long as it's respectful.
- Technical language is appropriate if it was in the original.`,
  };

  const toneGuidance: Record<Tone, string> = {
    professional: `Tone: Professional.
- Clean, confident, and polished.
- Correct grammar, proper punctuation, no run-ons.
- Avoid overly formal or stiff language — professional but human.
- Remove filler words, hedges, and redundancies.`,

    explain: `Tone: Explain & Detail.
- The goal is clarity — the reader should fully understand the core issue after reading.
- Add context where it's missing. Break down complex ideas into plain language.
- Use a logical structure: what happened → why it matters → what's being done.
- Don't oversimplify, but don't assume prior knowledge either.`,

    clean: `Tone: Clean & Production-ready.
- Strip everything non-essential. Every word must earn its place.
- Fix grammar, remove redundancy, tighten sentence structure.
- The result should feel like something that went through a real editorial pass.
- No fluff, no filler, no throat-clearing openers like "I just wanted to…"`,

    humanized: `Tone: Humanized.
- Make it sound like a thoughtful, articulate human wrote it — not a template or a bot.
- Use natural rhythm and varied sentence length. Avoid stiff corporate phrasing.
- It's okay to show a bit of personality — warmth, acknowledgment, genuine tone.
- Remove anything that sounds robotic, over-formal, or copy-paste generic.
- The reader should feel like they're hearing from a real person, not a press release.`,
  };

  return `You are an expert writing editor. Your job is to take rough, unpolished text and rewrite it cleanly and effectively for the given audience and tone.

${audienceGuidance[audience]}

${toneGuidance[tone]}

Output rules:
- Output ONLY the refined text. No explanation, no preamble, no "Here is the refined version:" header.
- Preserve the original meaning and intent exactly — you are improving the writing, not changing the message.
- If the original contains specific names, numbers, task IDs, or technical terms, keep them exactly as-is.
- Match the original format — if it's a paragraph, return a paragraph; if it's bullet points, return bullet points.
- Fix typos and grammar silently. Do not comment on what you changed.`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TextRefinerPage() {
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState<Audience>("client");
  const [tone, setTone] = useState<Tone>("professional");
  const { data, loading, error, generate, reset } = useGenerate("text-refiner");
  const lastOptions = useRef<GenerateOptions | null>(null);

  const runGenerate = async (options: GenerateOptions) => {
    lastOptions.current = options;
    const result = await generate(options);
    if (!result) toast.error("Failed to refine text — see details below.");
  };

  const handleRefine = async () => {
    if (!input.trim()) return;
    await runGenerate({
      prompt: input.trim(),
      system: buildSystemPrompt(audience, tone),
      temperature: 0.45,
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
      title="Text Refiner"
      description="Refine messages for clients, managers, and coworkers with selectable tones"
      icon="PenLine"
    >
      <div className="relative h-full overflow-y-auto -m-6 p-6 min-h-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Toolbar */}
          <div className="rounded-md border border-border bg-surface-raised flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                To
              </span>
              <SegmentedControl
                options={AUDIENCE_OPTIONS}
                value={audience}
                onChange={setAudience}
                layoutId="tr-audience-segment"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Tone
              </span>
              <SegmentedControl
                options={TONE_OPTIONS}
                value={tone}
                onChange={setTone}
                layoutId="tr-tone-segment"
              />
            </div>
          </div>

          {/* Draft */}
          <div className="rounded-md border border-border bg-surface-raised overflow-hidden opacity-90">
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Draft
                </span>
              </div>
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
              placeholder="Paste or type the text you want to refine…"
              rows={5}
              className="w-full px-5 py-2 text-sm text-text-secondary placeholder-text-muted bg-transparent resize-none focus:outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
              <span className="text-xs text-text-muted tabular-nums truncate min-w-0">
                {input.trim() ? `${input.trim().length} chars` : " "}
              </span>
              <ToolActionButton
                onClick={handleRefine}
                loading={loading}
                disabled={!input.trim() || loading}
                icon={Sparkles}
              >
                {loading ? "Refining…" : "Refine Text"}
              </ToolActionButton>
            </div>
          </div>

          {/* Polished */}
          <AnimatePresence initial={false}>
            {(loading || hasOutput || error) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="rounded-md border border-border bg-surface-raised overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-4 pb-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Polished
                      </span>
                    </div>
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
                        <CopyButton text={data!.text} />
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 min-h-[6rem]">
                    {error && <p className="text-xs text-danger">{error}</p>}
                    {loading && <SkeletonLines lines={4} />}
                    {!loading && hasOutput && (
                      <MarkdownRenderer text={data!.text} className="text-sm" />
                    )}
                  </div>

                  {hasOutput && (
                    <div className="px-5 py-2.5 border-t border-border-subtle">
                      <ProviderBadge
                        provider={data!.provider}
                        model={data!.model}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && !hasOutput && !error && (
            <div className="rounded-md border border-border border-dashed bg-surface-raised flex flex-col items-center justify-center gap-2 text-center px-8 py-10">
              <div className="w-10 h-10 rounded-md border border-border flex items-center justify-center">
                <EmptyIcon
                  className="w-4.5 h-4.5 text-accent"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-sm text-text-muted">
                Pick an audience and tone, then hit Refine to see the polished
                version
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
