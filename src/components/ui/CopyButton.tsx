"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 overflow-hidden",
        copied
          ? "bg-success-subtle text-success"
          : "bg-surface-sunken text-text-secondary hover:bg-border",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="inline-flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
