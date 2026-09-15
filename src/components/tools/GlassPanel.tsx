import { clsx } from "clsx";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/**
 * Frosted, translucent panel — sits on top of a ToolMeshBackground so the
 * color wash reads through, Raycast/Arc-style, instead of a flat opaque
 * card. Falls back gracefully (just translucent, no blur) if the browser
 * doesn't support backdrop-filter.
 */
export function GlassPanel({ children, className, as: Tag = "div" }: GlassPanelProps) {
  return (
    <Tag
      className={clsx(
        "rounded-2xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.18)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_16px_40px_-16px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
