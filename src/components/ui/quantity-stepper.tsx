"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number | null;
  step?: number;
  disabled?: boolean;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = null,
  step = 1,
  disabled = false,
  label,
  decreaseLabel,
  increaseLabel,
  className,
}: QuantityStepperProps) {
  const buttonClass =
    "inline-flex size-9 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-40";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-control border border-line-strong bg-surface", className)}
    >
      <button
        type="button"
        className={buttonClass}
        aria-label={decreaseLabel}
        disabled={disabled || value - step < min}
        onClick={() => onChange(value - step)}
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-sm tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        aria-label={increaseLabel}
        disabled={disabled || (max !== null && value + step > max)}
        onClick={() => onChange(value + step)}
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
