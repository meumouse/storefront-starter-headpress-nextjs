"use client";

/* Review media may live on an object storage host `next/image` is not configured for. */
/* eslint-disable @next/next/no-img-element */
import type { ReviewMedia } from "@meumouse.com/headpress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Rating } from "@/components/ui/rating";
import { t } from "@/i18n";

import { fullUrl } from "../lib/media";

export type LightboxItem = Pick<ReviewMedia, "id" | "type" | "url" | "sizes"> & {
  caption?: { author: string | null; rating: number | null };
};

const arrowClass =
  "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-overlay text-ink-inverse transition hover:opacity-90";

/** Photos and videos at full size. Arrow keys move between them; a new key stops the last video. */
export function ReviewLightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: readonly LightboxItem[];
  index: number | null;
  onIndexChange(index: number): void;
  onClose(): void;
}) {
  const count = items.length;
  const open = index !== null && count > 0;
  const position = open ? Math.min(index, count - 1) : 0;
  const current = open ? items[position] : null;

  useEffect(() => {
    if (!open || count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onIndexChange((position + 1) % count);
      if (event.key === "ArrowLeft") onIndexChange((position - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, position, count, onIndexChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={t.reviews.lightboxTitle}
      description={open ? t.reviews.lightboxPosition(position + 1, count) : undefined}
      closeLabel={t.common.close}
      className="max-w-3xl"
    >
      {current ? (
        <div className="flex flex-col gap-3">
          <div className="relative flex min-h-[40vh] items-center justify-center rounded-control bg-sunken">
            {current.type === "video" ? (
              <video
                key={current.id}
                src={current.url}
                controls
                playsInline
                autoPlay
                preload="metadata"
                className="max-h-[70vh] w-full rounded-control"
              />
            ) : (
              <img
                key={current.id}
                src={fullUrl(current)}
                alt={current.caption?.author ? t.reviews.photoBy(current.caption.author) : ""}
                className="max-h-[70vh] w-auto rounded-control object-contain"
              />
            )}
            {count > 1 ? (
              <>
                <button
                  type="button"
                  className={`${arrowClass} left-2`}
                  aria-label={t.reviews.previous}
                  onClick={() => onIndexChange((position - 1 + count) % count)}
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`${arrowClass} right-2`}
                  aria-label={t.reviews.next}
                  onClick={() => onIndexChange((position + 1) % count)}
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
            <span className="flex items-center gap-2">
              {current.caption?.author ? <span>{current.caption.author}</span> : null}
              {current.caption?.rating ? (
                <Rating value={current.caption.rating} label={t.catalog.ratingLabel(current.caption.rating)} />
              ) : null}
            </span>
            {count > 1 ? <span className="tabular-nums">{t.reviews.lightboxPosition(position + 1, count)}</span> : null}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
