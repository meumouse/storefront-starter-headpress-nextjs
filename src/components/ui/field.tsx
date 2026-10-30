import { useId, type ComponentProps, type ReactElement, cloneElement } from "react";

import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand disabled:bg-sunken disabled:text-ink-muted aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, "h-11", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...props} />;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** One form control. Its `id` and ARIA attributes are filled in here. */
  children: ReactElement<ComponentProps<"input">>;
}

/** A labelled form control with its hint or validation message. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message ? (
        <p id={messageId} className={cn("text-xs", error ? "text-danger" : "text-ink-muted")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** A checkbox or radio with its label, sharing one click target. */
export function ChoiceLabel({
  className,
  children,
  ...props
}: ComponentProps<"input"> & { type: "checkbox" | "radio" }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink", className)}>
      <input className="mt-0.5 size-4 shrink-0 accent-[var(--ds-brand)]" {...props} />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
