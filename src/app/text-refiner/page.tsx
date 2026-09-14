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
import { RefreshCw, PenLine as EmptyIcon } from "lucide-react";
import type { GenerateOptions } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type Audience = "client" | "manager" | "team";
type Tone = "professional" | "explain" | "clean" | "humanized";

interface AudienceOption {
  id: Audience;
  label: string;
  description: string;
}

interface ToneOption {
  id: Tone;
  label: string;
  description: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: "client",
    label: "Client",
    description: "External — polished, no jargon",
  },
  {
    id: "manager",
    label: "Manager",
    description: "Internal — clear, concise, outcome-focused",
  },
  {
    id: "team",
    label: "Team",
    description: "Peers — casual but precise",
  },
];

const TONE_OPTIONS: ToneOption[] = [
  {
    id: "professional",
    label: "Professional",
    description: "Polished, confident, client-ready",
  },
  {
    id: "explain",
    label: "Explain & Detail",
    description: "Clearly explains the core issue with context",
  },
  {
    id: "clean",
    label: "Clean & Production",
    description: "Tightened, no fluff, ready to ship or send",
  },
  {
    id: "humanized",
    label: "Humanized",
    description: "Warm, natural — sounds like a real person wrote it",
  },
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
      <div className="h-full flex flex-col lg:flex-row gap-4 -m-6 p-6 min-h-0">
        {/* ── Left: Input + Options ── */}
        <div className="flex flex-col lg:w-[45%] shrink-0 min-h-0 gap-3">
          {/* Audience */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
              Audience
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAudience(opt.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
                    audience === opt.id
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600"
                      : "border-border bg-surface-raised hover:border-text-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      audience === opt.id
                        ? "text-emerald-700 dark:text-emerald-400"
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

          {/* Tone */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
              Tone
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTone(opt.id)}
                  className={clsx(
                    "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer",
                    tone === opt.id
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600"
                      : "border-border bg-surface-raised hover:border-text-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      tone === opt.id
                        ? "text-emerald-700 dark:text-emerald-400"
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
                Your rough text
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
              placeholder="Paste or type the text you want to refine…"
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
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm"
              >
                {loading ? "Refining…" : "Refine Text"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                Refined Text
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hasOutput ? (
                  <>
                    <span className="text-xs text-text-muted">
                      {AUDIENCE_OPTIONS.find((a) => a.id === audience)?.label} ·{" "}
                      {TONE_OPTIONS.find((t) => t.id === tone)?.label}
                    </span>
                    <ProviderBadge provider={data.provider} model={data.model} />
                  </>
                ) : (
                  <p className="text-xs text-text-muted">Ready to copy and send</p>
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
                  Your refined text will appear here
                </p>
                <p className="text-xs text-text-muted/70">
                  Pick an audience, pick a tone, then hit Refine
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
