"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { useSavedInstructions } from "@/lib/hooks/useSavedInstructions";
import { useDailyStatusLog } from "@/lib/hooks/useDailyStatusLog";
import { buildDailyStatusDateContext } from "@/lib/date-utils";
import { prepareInputWithAutoFill } from "@/lib/daily-status";
import { clsx } from "clsx";
import {
  BrainCircuit,
  Send,
  RefreshCw,
  Trash2,
  ChevronDown,
  ClipboardList,
  Wand2,
  PenLine,
  ListTodo,
  Sparkles,
  BookMarked,
  StopCircle,
} from "lucide-react";
import type { GenerateResult } from "@/lib/ai";

// ── Types ────────────────────────────────────────────────────────────────────

type ToolName =
  | "daily_status"
  | "prompt_rewriter"
  | "text_refiner"
  | "task_generator"
  | "direct_reply";

interface ToolCall {
  tool: ToolName;
  /** The input the orchestrator distilled for the tool */
  input: string;
  /** Extra config fields extracted by the orchestrator */
  config?: Record<string, string>;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  /** The final readable text shown to the user */
  text: string;
  /** Streaming buffer before the turn is sealed */
  streamText?: string;
  loading: boolean;
  toolCall?: ToolCall;
  result?: GenerateResult;
  error?: string;
}

interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

type Message = UserMessage | AssistantMessage;

// ── Tool metadata (for badges / attribution) ─────────────────────────────────

const TOOL_META: Record<
  ToolName,
  { label: string; icon: React.ElementType; color: string }
> = {
  daily_status: {
    label: "Daily Status",
    icon: ClipboardList,
    color: "text-accent",
  },
  prompt_rewriter: {
    label: "Prompt Rewriter",
    icon: Wand2,
    color: "text-accent",
  },
  text_refiner: {
    label: "Text Refiner",
    icon: PenLine,
    color: "text-accent",
  },
  task_generator: {
    label: "Task Generator",
    icon: ListTodo,
    color: "text-accent",
  },
  direct_reply: {
    label: "Assistant",
    icon: Sparkles,
    color: "text-accent",
  },
};

// ── System prompts for each tool (mirrors the individual pages) ──────────────

function buildDailyStatusPrompt(): string {
  return `You are a daily standup formatter. The user will give you raw bullet points or notes grouped into sections. Your job is to output a formatted daily status update.

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
- An explicit date like "09/10/2026" → treat as that literal date
- "worked on", "done", "completed" → same as yesterday
- "planned", "planned for", "tomorrow" → same as today

Multiple worked-on dates:
- Each past-date section becomes its own "Worked on MM/DD/YYYY:" block, in chronological order.
- There is still only one "Planned for" block (today).

Output structure:
- If only a "today/planned" section is given → output only the "Planned for" block.
- If only past-date sections are given → output only the "Worked on" block(s).
- If both are given → output all "Worked on" blocks first, then "Impediment: none", then "Planned for".

Text cleanup: fix typos, keep task IDs exactly as-is, keep parenthetical annotations exactly as-is.
Each bullet must start with " - " (one space, dash, one space).

${buildDailyStatusDateContext()}`;
}

function buildPromptRewriterPrompt(model: string, style: string): string {
  const modelGuidance: Record<string, string> = {
    claude: `The refined prompt is intended for Claude. Use explicit context, clear goals, and <context>/<task>/<output_format> XML tags where helpful. Be direct and thorough.`,
    chatgpt: `The refined prompt is intended for ChatGPT. Start with a role ("You are a…"), break complex tasks into numbered steps, be explicit about output format.`,
    general: `The refined prompt is intended for any LLM. Write model-agnostic instructions that work across Claude, ChatGPT, Gemini, etc.`,
  };
  const styleGuidance: Record<string, string> = {
    concise: `Style: Concise. Strip everything non-essential. One clear ask, no padding.`,
    detailed: `Style: Detailed. Include relevant background, examples, and edge cases.`,
    "chain-of-thought": `Style: Chain-of-thought. Instruct the model to think step-by-step before answering.`,
    structured: `Style: Structured. Use clear sections with headers (## Task, ## Constraints, ## Output format).`,
  };

  return `You are an expert prompt engineer. Rewrite the user's rough prompt into a high-quality prompt.

${modelGuidance[model] ?? modelGuidance.general}
${styleGuidance[style] ?? styleGuidance.detailed}

Output ONLY the refined prompt text. No explanation, no preamble. Preserve the user's original intent exactly.`;
}

function buildTextRefinerPrompt(audience: string, tone: string): string {
  const audienceMap: Record<string, string> = {
    client: `Audience: External client. Polished, professional language. No internal jargon. Frame issues positively.`,
    manager: `Audience: Manager. Direct and outcome-oriented. Lead with the key point, then give context.`,
    team: `Audience: Team peers. Casual but precise. Skip formalities. Technical language is fine.`,
  };
  const toneMap: Record<string, string> = {
    professional: `Tone: Professional. Clean, confident, and polished. Remove filler words and hedges.`,
    explain: `Tone: Explain & Detail. Clarity is the goal. Add context, break down complex ideas.`,
    clean: `Tone: Clean & Production-ready. Strip everything non-essential. Every word must earn its place.`,
    humanized: `Tone: Humanized. Natural rhythm, varied sentence length. Avoid stiff corporate phrasing.`,
  };

  return `You are an expert writing editor. Rewrite the user's text cleanly and effectively.

${audienceMap[audience] ?? audienceMap.client}
${toneMap[tone] ?? toneMap.professional}

Output ONLY the refined text. No explanation, no preamble. Preserve the original meaning and intent exactly.`;
}

function buildTaskGeneratorPrompt(
  taskType: string,
  includeAC: boolean,
): string {
  const framing: Record<string, string> = {
    feature: "This is a new feature request.",
    bug: "This is a bug fix. Describe the broken behavior and what the fixed behavior should be.",
    improvement: "This is an improvement to existing functionality.",
    chore: "This is a chore (cleanup, config, tooling, maintenance).",
  };

  return `You are an expert engineering lead. Turn the developer's rough task idea into a clean, structured developer task ready for a ticket tracker.

${framing[taskType] ?? framing.feature}

Output in EXACTLY this format, nothing before or after:

TITLE: <a short, clear, title-case task title, under 12 words>
DESCRIPTION: <2-4 sentences describing what needs to be done, why, and what "done" looks like.>${
    includeAC
      ? `\nACCEPTANCE CRITERIA:\n- <first concrete, testable condition>\n- <second condition>\n- <2-5 total>`
      : ""
  }

Do not add extra sections, headers, or commentary. Do not wrap in quotes or code fences.`;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

function buildOrchestratorPrompt(savedInstructionsContext: string): string {
  return `You are an intelligent AI Command Center — the central orchestrator for a personal productivity assistant.

You have access to these specialist tools:

1. **daily_status** — Formats raw standup notes (y/yesterday/t/today shorthands) into a strict Daily Status format. Use when the user wants to format or generate a daily status update.

2. **prompt_rewriter** — Rewrites rough prompts for Claude, ChatGPT, or general LLMs. Supports styles: concise, detailed, chain-of-thought, structured. Use when the user wants to improve or rewrite an AI prompt.

3. **text_refiner** — Rewrites text for a specific audience (client, manager, team) with a tone (professional, explain, clean, humanized). Use when the user wants to polish, refine, or rewrite a message or communication.

4. **task_generator** — Turns a rough task description into a structured developer ticket (title, description, optional acceptance criteria). Task types: feature, bug, improvement, chore. Use when the user wants to create a ticket, task, or story.

5. **direct_reply** — Answer directly without a specialist tool. Use for questions, explanations, comparisons, follow-ups, or anything that doesn't fit the above tools.

${savedInstructionsContext ? `The user has these saved instructions/context available:\n${savedInstructionsContext}\n` : ""}

When the user sends a request, decide which tool to use and respond with a JSON object ONLY — no prose before or after it:

For a specialist tool:
{
  "tool": "<tool_name>",
  "input": "<the exact text/content to process — cleaned up but preserving all meaning and specifics>",
  "config": {
    // tool-specific settings (all optional — omit keys to use sensible defaults)
    // daily_status: no config needed
    // prompt_rewriter: "model" (claude|chatgpt|general), "style" (concise|detailed|chain-of-thought|structured)
    // text_refiner: "audience" (client|manager|team), "tone" (professional|explain|clean|humanized)
    // task_generator: "task_type" (feature|bug|improvement|chore), "include_ac" (true|false)
  },
  "reasoning": "<one sentence explaining your tool choice, shown to the user>"
}

For a direct reply:
{
  "tool": "direct_reply",
  "input": "<your complete answer to the user>",
  "reasoning": "Answered directly"
}

Rules:
- Always output valid JSON. No markdown fences around it, no text before or after.
- For direct_reply, "input" IS the final answer — write it fully and helpfully.
- Extract config values intelligently from context clues in the user's message.
- If the user's request implies multiple tools (e.g. "format my status AND create a task for it"), pick the primary one and note the other in "reasoning".
- Preserve all specifics: task IDs, names, numbers, technical terms must pass through to "input" unchanged.`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function msgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseOrchestratorResponse(raw: string): ToolCall | null {
  // Strip any accidental markdown fences
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof obj.tool !== "string") return null;
    if (typeof obj.input !== "string") return null;
    return {
      tool: obj.tool as ToolName,
      input: obj.input,
      config: (obj.config as Record<string, string> | undefined) ?? {},
    };
  } catch {
    return null;
  }
}

function buildToolSystemPrompt(toolCall: ToolCall): string {
  const { tool, config = {} } = toolCall;
  switch (tool) {
    case "daily_status":
      return buildDailyStatusPrompt();
    case "prompt_rewriter":
      return buildPromptRewriterPrompt(
        config.model ?? "general",
        config.style ?? "detailed",
      );
    case "text_refiner":
      return buildTextRefinerPrompt(
        config.audience ?? "client",
        config.tone ?? "professional",
      );
    case "task_generator":
      return buildTaskGeneratorPrompt(
        config.task_type ?? "feature",
        config.include_ac === "true",
      );
    default:
      return "";
  }
}

function getToolTemperature(tool: ToolName): number {
  switch (tool) {
    case "daily_status":
      return 0.2;
    case "task_generator":
      return 0.4;
    case "prompt_rewriter":
      return 0.4;
    case "text_refiner":
      return 0.45;
    default:
      return 0.7;
  }
}

// ── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    label: "📋 Format my standup",
    prompt:
      "y\nFixed the login bug\nUpdated unit tests\n\nt\nFinish the PR review\nWrite release notes",
  },
  {
    label: "✨ Rewrite this prompt",
    prompt:
      "rewrite this prompt for claude: explain how react hooks work in simple terms",
  },
  {
    label: "💬 Polish a message",
    prompt:
      "refine this for my manager: hey so the deploy broke again bc someone pushed without testing, fixing it now shouldnt take long",
  },
  {
    label: "🎯 Create a task",
    prompt:
      "create a task: add dark mode toggle to settings page, should persist user preference in localstorage",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Two generate hooks: one for the orchestrator call, one for the tool call.
  // They share the "command-center" toolId so history logs it uniformly.
  const orchestrator = useGenerate("command-center");
  const executor = useGenerate("command-center");

  const { instructions } = useSavedInstructions();
  const { lastEntry, recordTodayItems } = useDailyStatusLog();

  // Build a condensed saved-instructions context string for the orchestrator
  const savedInstructionsContext = instructions
    .slice(0, 8) // keep the prompt manageable
    .map((i) => `[${i.title}]: ${i.content.slice(0, 200)}`)
    .join("\n");

  // Auto-scroll to bottom on new messages / stream updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  };

  /** Fill the textarea with a suggestion without sending — user reviews and hits Send. */
  const fillInput = useCallback((text: string) => {
    setInput(text);
    // Give React a tick to apply the value, then resize + focus
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
      ta.focus();
      // Move cursor to end
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
  }, []);

  const stopRunning = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setIsRunning(false);
    // Seal any loading message as cancelled
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "assistant" && m.loading
          ? {
              ...m,
              loading: false,
              text: m.streamText || m.text || "Cancelled.",
              streamText: undefined,
            }
          : m,
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isRunning) return;

      // Add user message
      const userId = msgId();
      const userMsg: UserMessage = { id: userId, role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setIsRunning(true);

      // Placeholder assistant message (loading)
      const assistantId = msgId();
      const placeholderMsg: AssistantMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        loading: true,
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      // ── Phase 1: Orchestrator call ──────────────────────────────────────
      let orchestratorAborted = false;
      const orchCtrl = new AbortController();
      abortRef.current = () => {
        orchestratorAborted = true;
        orchCtrl.abort();
      };

      let toolCall: ToolCall | null = null;

      try {
        const orchResult = await orchestrator.generate({
          prompt: trimmed,
          system: buildOrchestratorPrompt(savedInstructionsContext),
          temperature: 0.2,
          stream: false,
          signal: orchCtrl.signal,
        });

        if (orchestratorAborted) return;

        if (!orchResult) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    loading: false,
                    error: orchestrator.error ?? "Orchestration failed.",
                  }
                : m,
            ),
          );
          setIsRunning(false);
          return;
        }

        toolCall = parseOrchestratorResponse(orchResult.text);

        if (!toolCall) {
          // Orchestrator returned non-JSON prose — show it directly
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    loading: false,
                    text: orchResult.text,
                    result: orchResult,
                    toolCall: { tool: "direct_reply", input: orchResult.text },
                  }
                : m,
            ),
          );
          setIsRunning(false);
          return;
        }

        // direct_reply: the orchestrator's "input" is already the answer
        if (toolCall.tool === "direct_reply") {
          const tc = toolCall;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    loading: false,
                    text: tc.input,
                    result: orchResult,
                    toolCall: tc,
                  }
                : m,
            ),
          );
          setIsRunning(false);
          return;
        }

        // Update message to show "routing to tool…" state
        const tc = toolCall;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, toolCall: tc, loading: true } : m,
          ),
        );
      } catch (err) {
        if (orchestratorAborted) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  loading: false,
                  error: err instanceof Error ? err.message : "Unknown error",
                }
              : m,
          ),
        );
        setIsRunning(false);
        return;
      }

      // ── Phase 2: Tool execution ─────────────────────────────────────────
      let toolAborted = false;
      const toolCtrl = new AbortController();
      abortRef.current = () => {
        toolAborted = true;
        toolCtrl.abort();
      };

      const systemPrompt = buildToolSystemPrompt(toolCall);
      const temperature = getToolTemperature(toolCall.tool);

      let executorInput = toolCall.input;
      if (toolCall.tool === "daily_status") {
        const { input: preparedInput, autoFilled } = prepareInputWithAutoFill(
          toolCall.input,
          lastEntry,
          new Date(),
        );
        executorInput = preparedInput;
        if (autoFilled && lastEntry) {
          toast.info(
            `Included your saved update from ${lastEntry.dateLabel} as yesterday's work.`,
          );
        }
      }

      const toolResult = await executor.generate(
        {
          prompt: executorInput,
          system: systemPrompt,
          temperature,
          stream: true,
          signal: toolCtrl.signal,
        },
        {
          onToken: (_delta, accumulated) => {
            if (toolAborted) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, loading: true, streamText: accumulated }
                  : m,
              ),
            );
          },
        },
      );

      if (toolAborted) return;

      if (!toolResult) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? {
                  ...m,
                  loading: false,
                  text: m.streamText || "",
                  streamText: undefined,
                  error: executor.error ?? "Tool execution failed.",
                }
              : m,
          ),
        );
        toast.error("Tool execution failed — see message for details.");
      } else {
        if (toolCall.tool === "daily_status") {
          recordTodayItems(toolCall.input, new Date());
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  loading: false,
                  text: toolResult.text,
                  streamText: undefined,
                  result: toolResult,
                }
              : m,
          ),
        );
      }

      abortRef.current = null;
      setIsRunning(false);
    },
    [
      isRunning,
      orchestrator,
      executor,
      savedInstructionsContext,
      lastEntry,
      recordTodayItems,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRegenerate = useCallback(
    (msgId: string) => {
      // Find the user message immediately before this assistant message
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msgId);
        if (idx < 1) return prev;
        const prior = prev[idx - 1];
        if (prior.role !== "user") return prev;
        // Remove the assistant message and resend
        const next = prev.slice(0, idx);
        // Schedule the resend asynchronously so state is settled first
        setTimeout(() => sendMessage(prior.text), 0);
        return next;
      });
    },
    [sendMessage],
  );

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      // If it's an assistant message, also remove the preceding user message
      const target = prev[idx];
      if (
        target.role === "assistant" &&
        idx > 0 &&
        prev[idx - 1].role === "user"
      ) {
        return prev.filter((_, i) => i !== idx && i !== idx - 1);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const clearAll = () => {
    setMessages([]);
  };

  const displayText = (m: AssistantMessage) =>
    m.loading ? (m.streamText ?? "") : m.text;

  return (
    <PageShell
      title="Command Center"
      description="Describe what you need — the assistant picks the right tool automatically"
      icon="BrainCircuit"
    >
      <div className="relative h-full flex flex-col -m-6 min-h-0">
        {/* ── Message thread ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0">
          {/* Empty state */}
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center min-h-[50vh] gap-7 text-center px-4"
              >
                {/* Icon */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-md border border-border flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-accent" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-surface-raised" />
                </div>

                {/* Headline */}
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                    What do you need today?
                  </h2>
                  <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
                    Describe your goal in plain language. I&apos;ll pick the
                    right tool automatically.
                  </p>
                </div>

                {/* Suggestion chips — fill input, don't auto-send */}
                <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Try one of these
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => fillInput(s.prompt)}
                        disabled={isRunning}
                        className="w-full text-left px-4 py-2.5 rounded-md border border-border bg-surface-raised text-sm text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-accent-subtle transition-all duration-150 disabled:opacity-50 group"
                      >
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {msg.role === "user" ? (
                  <UserBubble
                    message={msg}
                    onDelete={() => handleDeleteMessage(msg.id)}
                  />
                ) : (
                  <AssistantBubble
                    message={msg}
                    displayText={displayText(msg)}
                    onRegenerate={() => handleRegenerate(msg.id)}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    isRunning={isRunning}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* ── Toolbar: clear + stop ────────────────────────────────────────── */}
        {messages.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t border-border bg-surface-raised">
            <button
              onClick={clearAll}
              disabled={isRunning}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear conversation
            </button>
            {isRunning && (
              <button
                onClick={stopRunning}
                className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop
              </button>
            )}
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-surface">
          <div
            className={clsx(
              "flex items-end gap-3 rounded-md border bg-surface-raised px-4 py-3 transition-all duration-200",
              isRunning
                ? "border-accent/40"
                : "border-border hover:border-border-subtle focus-within:border-accent",
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isRunning ? "Waiting for response…" : "Describe what you need…"
              }
              rows={1}
              disabled={isRunning}
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none leading-relaxed disabled:opacity-40 max-h-[200px]"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 shrink-0">
              {input.trim().length > 0 && !isRunning && (
                <span className="text-[10px] tabular-nums text-text-muted select-none">
                  {input.trim().length}
                </span>
              )}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isRunning}
                className={clsx(
                  "flex items-center justify-center w-9 h-9 rounded-md transition-all duration-150",
                  input.trim() && !isRunning
                    ? "bg-accent hover:bg-accent-hover text-white"
                    : "bg-surface-sunken text-text-muted cursor-not-allowed",
                )}
                aria-label="Send"
              >
                {isRunning ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-text-muted/70">
            <kbd className="font-mono bg-surface-sunken px-1 py-0.5 rounded text-[9px]">
              Enter
            </kbd>{" "}
            to send &nbsp;·&nbsp;{" "}
            <kbd className="font-mono bg-surface-sunken px-1 py-0.5 rounded text-[9px]">
              ⇧ Enter
            </kbd>{" "}
            for new line
          </p>
        </div>
      </div>
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserBubble({
  message,
  onDelete,
}: {
  message: UserMessage;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 group">
      <div className="relative max-w-[80%] sm:max-w-[65%]">
        <div className="rounded-md rounded-tr-sm bg-accent px-4 py-2.5">
          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
            {message.text}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-text-muted hover:text-danger"
          aria-label="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  displayText,
  onRegenerate,
  onDelete,
  isRunning,
}: {
  message: AssistantMessage;
  displayText: string;
  onRegenerate: () => void;
  onDelete: () => void;
  isRunning: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const toolMeta = message.toolCall
    ? TOOL_META[message.toolCall.tool]
    : TOOL_META.direct_reply;
  const ToolIcon = toolMeta.icon;
  const hasContent = displayText.length > 0;

  return (
    <div className="flex justify-start gap-3 group">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5 bg-surface-sunken border border-border">
        <ToolIcon className="w-4 h-4 text-text-secondary" aria-hidden="true" />
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0 max-w-[90%] sm:max-w-[75%]">
        {/* Tool attribution header */}
        {message.toolCall && message.toolCall.tool !== "direct_reply" && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
                "bg-surface-raised border-border text-text-muted",
              )}
            >
              <ToolIcon className={clsx("w-3 h-3", toolMeta.color)} />
              {toolMeta.label}
            </span>
          </div>
        )}

        <div
          className={clsx(
            "rounded-md rounded-tl-sm border bg-surface-raised overflow-hidden",
            message.error ? "border-danger/30" : "border-border",
          )}
        >
          {/* Loading state — pulsing dots before first token arrives */}
          {message.loading && !hasContent && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-text-muted">
                {message.toolCall && message.toolCall.tool !== "direct_reply"
                  ? `Running ${toolMeta.label}…`
                  : "Thinking…"}
              </span>
            </div>
          )}

          {/* Error */}
          {message.error && (
            <div className="flex items-start gap-2.5 m-3 p-3 rounded-md bg-danger-subtle border border-danger/20">
              <span className="text-xs font-semibold text-danger mt-0.5 shrink-0">
                Error
              </span>
              <p className="text-xs text-danger">{message.error}</p>
            </div>
          )}

          {/* Content — streaming or settled */}
          {hasContent && (
            <>
              <div
                className={clsx(
                  "px-4 pt-3.5 pb-3 transition-all duration-200",
                  !expanded && "max-h-32 overflow-hidden",
                )}
              >
                <div className="text-sm text-text-primary">
                  <MarkdownRenderer text={displayText} />
                  {/* Streaming cursor */}
                  {message.loading && (
                    <span className="inline-block w-0.5 h-4 bg-accent align-middle ml-0.5 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Collapse toggle for long responses */}
              {!message.loading && displayText.length > 600 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-border/50 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronDown
                    className={clsx(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      expanded && "rotate-180",
                    )}
                  />
                  {expanded ? "Collapse" : "Show full response"}
                </button>
              )}
            </>
          )}

          {/* Footer: provider badge + actions */}
          {!message.loading && (hasContent || message.error) && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border/40 bg-surface-sunken/40">
              <div className="min-w-0">
                {message.result ? (
                  <ProviderBadge
                    provider={message.result.provider}
                    model={message.result.model}
                  />
                ) : (
                  <span className="text-[10px] text-text-muted">
                    Command Center
                  </span>
                )}
              </div>
              {!message.error && hasContent && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={onRegenerate}
                    disabled={isRunning}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-sunken transition-colors disabled:opacity-40"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <CopyButton text={displayText} />
                  <button
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-subtle transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reasoning hint (collapsed, only if not direct_reply) */}
        {!message.loading &&
          message.toolCall &&
          message.toolCall.tool !== "direct_reply" && (
            <BookMarked className="hidden" aria-hidden="true" />
          )}
      </div>
    </div>
  );
}
