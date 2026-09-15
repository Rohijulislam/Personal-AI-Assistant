"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { ToolMeshBackground } from "@/components/tools/ToolMeshBackground";
import { GlassPanel } from "@/components/tools/GlassPanel";
import { ToolActionButton } from "@/components/tools/ToolActionButton";
import { SegmentedControl } from "@/components/tools/SegmentedControl";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
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
      color="from-emerald-500 to-teal-600"
    >
      <div className="relative h-full overflow-y-auto -m-6 p-6 min-h-0">
        <ToolMeshBackground colors={["bg-emerald-400", "bg-teal-400", "bg-lime-300"]} />

        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Toolbar */}
          <GlassPanel className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                To
              </span>
              <SegmentedControl
                options={AUDIENCE_OPTIONS}
                value={audience}
                onChange={setAudience}
                layoutId="tr-audience-segment"
                activeGradient="from-emerald-500 to-teal-500"
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
                activeGradient="from-emerald-500 to-teal-500"
              />
            </div>
          </GlassPanel>

          {/* Draft */}
          <GlassPanel className="overflow-hidden opacity-90">
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
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/40 dark:border-white/10">
              <span className="text-xs text-text-muted tabular-nums truncate min-w-0">
                {input.trim() ? `${input.trim().length} chars` : " "}
              </span>
              <ToolActionButton
                onClick={handleRefine}
                loading={loading}
                disabled={!input.trim() || loading}
                icon={Sparkles}
                gradient="from-emerald-500 to-teal-500"
                glow="hover:shadow-emerald-500/40"
              >
                {loading ? "Refining…" : "Refine Text"}
              </ToolActionButton>
            </div>
          </GlassPanel>

          {/* Polished */}
          <AnimatePresence initial={false}>
            {(loading || hasOutput || error) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <GlassPanel
                  className={clsx(
                    "overflow-hidden transition-shadow duration-300",
                    hasOutput &&
                      "ring-1 ring-emerald-400/30 shadow-[0_0_32px_-8px_rgba(16,185,129,0.4)]"
                  )}
                >
                  <div className="flex items-center justify-between px-5 pt-4 pb-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
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
                      <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                        {data!.text}
                      </pre>
                    )}
                  </div>

                  {hasOutput && (
                    <div className="px-5 py-2.5 border-t border-white/40 dark:border-white/10">
                      <ProviderBadge provider={data!.provider} model={data!.model} />
                    </div>
                  )}
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && !hasOutput && !error && (
            <GlassPanel className="flex flex-col items-center justify-center gap-2 text-center px-8 py-10 border-dashed">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <EmptyIcon className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-text-muted">
                Pick an audience and tone, then hit Refine to see the polished version
              </p>
            </GlassPanel>
          )}
        </div>
      </div>
    </PageShell>
  );
}
