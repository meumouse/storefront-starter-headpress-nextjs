import type { ReviewSummary as Summary } from "@meumouse.com/headpress";
import type { ReactNode } from "react";

import { Rating } from "@/components/ui/rating";
import { storeLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

const STARS = [5, 4, 3, 2, 1] as const;

/** Average and count, then one bar per star. Each bar toggles a filter on that rating. */
export function ReviewSummary({
  summary,
  activeRating,
  onRatingClick,
  action,
}: {
  summary: Summary;
  activeRating: number | null;
  onRatingClick(rating: number): void;
  action?: ReactNode;
}) {
  const rated = Math.max(summary.rated, 0);
  const average = new Intl.NumberFormat(storeLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    summary.average,
  );

  return (
    <div className="grid gap-6 rounded-card bg-sunken p-5 sm:p-6 md:grid-cols-[14rem_1fr] md:items-center md:gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-5xl leading-none font-semibold">
          {average}
          <span className="ml-1 text-base font-normal text-ink-muted">{t.reviews.outOf}</span>
        </p>
        <Rating value={summary.average} label={t.catalog.ratingLabel(summary.average)} />
        <p className="text-sm text-ink-muted">{t.catalog.reviewCount(summary.count)}</p>
        {action ? <div className="mt-2 w-full">{action}</div> : null}
      </div>

      <ul className="flex flex-col gap-1.5">
        {STARS.map((star) => {
          const count = summary.distribution[String(star) as keyof Summary["distribution"]] ?? 0;
          const percent = rated > 0 ? Math.round((count / rated) * 100) : 0;
          const active = activeRating === star;
          return (
            <li key={star}>
              <button
                type="button"
                onClick={() => onRatingClick(star)}
                disabled={count === 0 && !active}
                aria-pressed={active}
                aria-label={t.reviews.starFilter(star, count)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-control px-2 py-1 text-sm transition-colors enabled:hover:bg-surface disabled:cursor-default",
                  active && "bg-surface",
                )}
              >
                <span className="w-20 shrink-0 text-left text-ink-muted">{t.reviews.starCount(star)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={cn("block h-full rounded-full bg-warning", active && "bg-brand")}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-ink-muted tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
