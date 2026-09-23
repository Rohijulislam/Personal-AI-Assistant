import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={clsx("animate-pulse rounded-md bg-surface-sunken", className)}
    />
  );
}

interface SkeletonLinesProps {
  lines?: number;
  className?: string;
}

const DEFAULT_WIDTHS = ["100%", "92%", "96%", "78%", "88%"];

export function SkeletonLines({ lines = 4, className }: SkeletonLinesProps) {
  return (
    <div className={clsx("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: DEFAULT_WIDTHS[i % DEFAULT_WIDTHS.length] }}
        />
      ))}
    </div>
  );
}
