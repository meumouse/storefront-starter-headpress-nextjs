import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Page width and side gutters. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[var(--ds-content-width)] px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface p-5 shadow-card sm:p-6", className)}
      {...props}
    />
  );
}

export function PageHeading({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-sm text-ink-muted">{eyebrow}</div> : null}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
