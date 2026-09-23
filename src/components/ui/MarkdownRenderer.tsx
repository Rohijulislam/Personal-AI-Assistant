"use client";

import { memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import { clsx } from "clsx";
import { CopyButton } from "./CopyButton";

interface MarkdownRendererProps {
  text: string;
  className?: string;
}

/** Flattens a React children tree down to its plain text, for the code-block copy button. */
function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return getNodeText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const codeEl = Array.isArray(children) ? children[0] : children;
  const codeClassName =
    (codeEl as { props?: { className?: string } })?.props?.className ?? "";
  const lang = /language-(\w+)/.exec(codeClassName)?.[1];
  const raw = getNodeText(codeEl).replace(/\n$/, "");

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-block-header">
        <span>{lang ?? "text"}</span>
        <CopyButton
          text={raw}
          className="!py-1 !px-2 !text-[11px] !bg-transparent !text-white/70 hover:!bg-white/10 hover:!text-white"
        />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

/**
 * Renders AI/user text as rich text: markdown formatting (headings, lists,
 * tables, links, bold/italic, highlighted code blocks) when the model used
 * it, while single line breaks behave like plain text (via remark-breaks)
 * so ordinary prose still reads exactly as it did before.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  text,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={clsx("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
