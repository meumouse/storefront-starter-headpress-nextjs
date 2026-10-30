import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** The URL of a page. */
  href: (page: number) => string;
  label: string;
  previousLabel: string;
  nextLabel: string;
}

/** Page numbers around the current one, with `null` where a gap goes. */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((entry) => entry >= 1 && entry <= totalPages).sort((a, b) => a - b);

  return pages.flatMap((entry, index) => {
    const previous = pages[index - 1];
    return previous !== undefined && entry - previous > 1 ? [null, entry] : [entry];
  });
}

export function Pagination({ page, totalPages, href, label, previousLabel, nextLabel }: PaginationProps) {
  if (totalPages <= 1) return null;

  const itemClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-control px-3 text-sm transition-colors hover:bg-sunken";

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={itemClass} aria-label={previousLabel}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-1 text-ink-subtle">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(itemClass, entry === page && "bg-ink text-ink-inverse hover:bg-ink")}
          >
            {entry}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className={itemClass} aria-label={nextLabel}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
