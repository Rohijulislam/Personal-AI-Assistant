"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { ProviderBadge } from "@/components/ui/ProviderBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { useGenerate } from "@/lib/hooks/useGenerate";
import { clsx } from "clsx";
import {
  MessageSquare,
  Send,
  Trash2,
  StopCircle,
  Bot,
  User,
  RefreshCw,
} from "lucide-react";
import type { GenerateResult } from "@/lib/ai";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  text: string;
  streamText?: string;
  loading: boolean;
  result?: GenerateResult;
  error?: string;
}

type Message = UserMessage | AssistantMessage;

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant. Respond conversationally and naturally. Be concise unless the user asks for detail. Format your response with markdown only when it genuinely helps readability (code blocks, lists for enumeration). For simple questions, just answer in plain prose.`;

const STARTERS = [
  {
    emoji: "💡",
    label: "Explain a concept",
    prompt: "Can you explain how transformer models work in plain English?",
  },
  {
    emoji: "✍️",
    label: "Help me write",
    prompt:
      "Help me write a short professional bio. I'm a software engineer with 5 years of experience.",
  },
  {
    emoji: "🔍",
    label: "Compare two things",
    prompt: "What are the key differences between REST and GraphQL?",
  },
  {
    emoji: "🐛",
    label: "Debug with me",
    prompt:
      "I'm getting a 'cannot read property of undefined' error in JavaScript. What are the common causes?",
  },
];

/** Build a conversation transcript from prior messages for context injection */
function buildContextPrompt(history: Message[], currentPrompt: string): string {
  if (history.length === 0) return currentPrompt;

  const transcript = history
    .filter(
      (m): m is UserMessage | AssistantMessage =>
        m.role === "user" || (m.role === "assistant" && !m.loading && !!m.text),
    )
    .map((m) =>
      m.role === "user"
        ? `User: ${m.text}`
        : `Assistant: ${(m as AssistantMessage).text}`,
    )
    .join("\n\n");

  return `${transcript}\n\nUser: ${currentPrompt}`;
}

function msgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-md border border-border flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            What&apos;s on your mind?
          </h2>
          <p className="mt-1 text-sm text-text-muted max-w-xs">
            Ask anything — no routing, no templates, just a conversation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="group text-left px-4 py-3 rounded-md border border-border bg-surface-raised hover:border-accent/50 hover:bg-accent-subtle transition-all duration-150"
          >
            <span className="text-base leading-none">{s.emoji}</span>
            <p className="mt-1.5 text-xs font-medium text-text-primary group-hover:text-accent transition-colors">
              {s.label}
            </p>
            <p className="mt-0.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onRegenerate,
}: {
  message: Message;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const asst = isAssistant ? (message as AssistantMessage) : null;
  const liveText = asst?.streamText ?? asst?.text ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={clsx(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
          isUser
            ? "bg-accent"
            : "bg-surface-sunken border border-border",
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" aria-hidden="true" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          "flex flex-col gap-1.5 max-w-[78%]",
          isUser && "items-end",
        )}
      >
        {isUser && (
          <div className="px-4 py-2.5 rounded-md rounded-tr-sm bg-accent text-white text-sm leading-relaxed">
            {(message as UserMessage).text}
          </div>
        )}

        {isAssistant && (
          <>
            {/* Loading dots */}
            {asst!.loading && !asst!.streamText && (
              <div className="px-4 py-3 rounded-md rounded-tl-sm bg-surface-raised border border-border">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-text-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Streaming / settled text */}
            {(asst!.streamText || (!asst!.loading && asst!.text)) && (
              <div className="px-4 py-2.5 rounded-md rounded-tl-sm bg-surface-raised border border-border text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {liveText}
                {asst!.loading && (
                  <motion.span
                    className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                )}
              </div>
            )}

            {/* Error */}
            {asst!.error && (
              <div className="px-4 py-2.5 rounded-md rounded-tl-sm bg-danger-subtle border border-danger/20 text-sm text-danger">
                {asst!.error}
              </div>
            )}

            {/* Footer: provider badge + actions */}
            {!asst!.loading && (asst!.text || asst!.error) && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {asst!.result && (
                  <ProviderBadge
                    provider={asst!.result.provider}
                    model={asst!.result.model}
                  />
                )}
                {asst!.text && <CopyButton text={asst!.text} />}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    title="Regenerate"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-sunken text-text-secondary hover:bg-border transition-colors duration-150"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const { generate, cancel } = useGenerate("chat");

  // Auto-scroll on new messages / stream updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  };

  const fillInput = useCallback((text: string) => {
    setInput(text);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
  }, []);

  const stopRunning = useCallback(() => {
    abortRef.current?.();
    cancel();
    abortRef.current = null;
    setIsRunning(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "assistant" && (m as AssistantMessage).loading
          ? {
              ...m,
              loading: false,
              text:
                (m as AssistantMessage).streamText ||
                (m as AssistantMessage).text ||
                "Cancelled.",
              streamText: undefined,
            }
          : m,
      ),
    );
  }, [cancel]);

  const clearConversation = useCallback(() => {
    if (isRunning) stopRunning();
    setMessages([]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [isRunning, stopRunning]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isRunning) return;

      const userId = msgId();
      const userMsg: UserMessage = { id: userId, role: "user", text: trimmed };

      // Capture history before updating state
      const historySnapshot = [...messages];

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsRunning(true);

      const assistantId = msgId();
      const placeholder: AssistantMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        loading: true,
      };
      setMessages((prev) => [...prev, placeholder]);

      let aborted = false;
      const ctrl = new AbortController();
      abortRef.current = () => {
        aborted = true;
        ctrl.abort();
      };

      const prompt = buildContextPrompt(historySnapshot, trimmed);

      const result = await generate(
        {
          prompt,
          system: SYSTEM_PROMPT,
          temperature: 0.7,
          stream: true,
          signal: ctrl.signal,
        },
        {
          onToken: (_delta, accumulated) => {
            if (aborted) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, loading: true, streamText: accumulated }
                  : m,
              ),
            );
          },
          onCancel: () => {
            // handled by stopRunning
          },
        },
      );

      if (aborted) return;

      if (!result) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  loading: false,
                  streamText: undefined,
                  error: "The AI didn't respond. Please try again.",
                }
              : m,
          ),
        );
        toast.error("No response from the AI.");
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  loading: false,
                  text: result.text,
                  streamText: undefined,
                  result,
                }
              : m,
          ),
        );
      }

      abortRef.current = null;
      setIsRunning(false);
    },
    [messages, isRunning, generate],
  );

  /** Re-send the last user message to get a fresh reply */
  const regenerate = useCallback(() => {
    // Find the last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user") as
      | UserMessage
      | undefined;
    if (!lastUser) return;

    // Trim everything from the last assistant message onward
    const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
    const trimmedHistory = messages.slice(0, lastUserIdx);

    setMessages(trimmedHistory);
    sendMessage(lastUser.text);
  }, [messages, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <PageShell
      title="Chat"
      description="General-purpose conversation with the AI"
      icon="MessageSquare"
    >
      {/* Full-bleed layout inside PageShell's p-4/p-6 content area */}
      <div className="relative flex flex-col -m-4 sm:-m-6 h-[calc(100%+2rem)] sm:h-[calc(100%+3rem)] min-h-0">
        {/* Message thread */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <EmptyState onSelect={fillInput} />
              </motion.div>
            ) : (
              <motion.div
                key="thread"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="px-4 sm:px-6 py-6 space-y-5"
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => {
                    const isLastAssistant =
                      msg.role === "assistant" && i === messages.length - 1;
                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        onRegenerate={
                          isLastAssistant && !isRunning ? regenerate : undefined
                        }
                      />
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border bg-surface-raised px-4 sm:px-6 py-3">
          {/* Clear button — only when there are messages */}
          {!isEmpty && (
            <div className="flex justify-end mb-2">
              <button
                onClick={clearConversation}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors disabled:opacity-40"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          )}

          <div className="flex items-end gap-2.5">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message the AI… (Shift+Enter for new line)"
                rows={1}
                disabled={isRunning}
                className={clsx(
                  "w-full resize-none rounded-md border bg-surface-raised px-4 py-3 text-sm text-text-primary placeholder-text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60",
                  "transition-colors duration-150 leading-relaxed",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "border-border",
                )}
                style={{ minHeight: "44px", maxHeight: "180px" }}
                aria-label="Message input"
              />
            </div>

            {/* Send / Stop */}
            {isRunning ? (
              <button
                onClick={stopRunning}
                className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center bg-danger/10 text-danger hover:bg-danger/20 transition-colors duration-150"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <StopCircle className="w-4.5 h-4.5" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className={clsx(
                  "flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center transition-all duration-150",
                  input.trim()
                    ? "bg-accent hover:bg-accent-hover text-white"
                    : "bg-surface-sunken text-text-muted cursor-not-allowed",
                )}
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="mt-2 text-[10px] text-text-muted text-center">
            AI can make mistakes — verify important information.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
