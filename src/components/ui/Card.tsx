import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Card({ children, className, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={clsx(
        "rounded-xl border border-border bg-surface-raised shadow-sm",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-5 py-4 border-b border-border-subtle", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "px-5 py-3 border-t border-border-subtle bg-surface-sunken/50 rounded-b-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
