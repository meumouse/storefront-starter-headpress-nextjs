"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";

import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** Five radio buttons drawn as stars, so the keyboard and screen readers get a real choice. */
export function StarInput({
  value,
  onChange,
  error,
}: {
  value: number | null;
  onChange(value: number): void;
  error?: string;
}) {
  const name = useId();
  const errorId = `${name}-error`;
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value ?? 0;

  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{t.reviews.formRating}</legend>
      <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer" onMouseEnter={() => setHovered(star)}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              aria-label={t.reviews.formRatingStar(star)}
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className={cn(
                "size-8 rounded-control text-line-strong transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand",
                star <= shown && "fill-current text-warning",
              )}
            />
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
