import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Five stars filled to `value`; `label` is what a screen reader hears. */
export function Rating({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = `${(Math.min(Math.max(value, 0), 5) / 5) * 100}%`;
  const stars = Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4 fill-current" aria-hidden />);

  return (
    <span role="img" aria-label={label} className={cn("relative inline-flex text-line-strong", className)}>
      {stars}
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-warning" style={{ width: percent }}>
        <span className="flex shrink-0">{stars}</span>
      </span>
    </span>
  );
}
