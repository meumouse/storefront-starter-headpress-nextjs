/* Review media may live on an object storage host `next/image` is not configured for. */
/* eslint-disable @next/next/no-img-element */
import type { Review, ReviewMedia } from "@meumouse.com/headpress";
import { Play, ThumbsUp } from "lucide-react";

import { Badge } from "@/components/ui/feedback";
import { Rating } from "@/components/ui/rating";
import { storeLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

import { formatReviewDate, thumbnailUrl } from "../lib/media";

export function MediaThumb({
  media,
  label,
  onClick,
  className,
}: {
  media: Pick<ReviewMedia, "type" | "url" | "sizes">;
  label: string;
  onClick(): void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative size-20 shrink-0 overflow-hidden rounded-control bg-sunken ring-brand transition hover:opacity-90 focus-visible:ring-2",
        className,
      )}
    >
      {media.type === "video" ? (
        <>
          <video src={`${media.url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-overlay text-ink-inverse">
            <Play className="size-6 fill-current" aria-hidden />
          </span>
        </>
      ) : (
        <img src={thumbnailUrl(media)} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </button>
  );
}

export interface HelpfulVote {
  voted: boolean;
  count: number;
  pending: boolean;
  onToggle(): void;
}

export function ReviewItem({
  review,
  showVerified,
  showAvatar,
  helpful,
  onOpenMedia,
}: {
  review: Review;
  showVerified: boolean;
  showAvatar: boolean;
  helpful?: HelpfulVote;
  onOpenMedia(index: number): void;
}) {
  const author = review.author.anonymous || !review.author.name ? t.reviews.anonymous : review.author.name;

  return (
    <article className="flex flex-col gap-3 py-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {showAvatar && review.author.avatar ? (
          <img src={review.author.avatar} alt="" className="size-8 rounded-full bg-sunken" />
        ) : null}
        <span className="text-sm font-medium">{author}</span>
        {showVerified && review.verified ? <Badge tone="success">{t.catalog.verifiedPurchase}</Badge> : null}
        <time dateTime={review.created_at} className="text-xs text-ink-subtle">
          {formatReviewDate(review.created_at, storeLocale)}
        </time>
      </header>

      {review.rating ? <Rating value={review.rating} label={t.catalog.ratingLabel(review.rating)} /> : null}
      {review.title ? <h3 className="font-medium">{review.title}</h3> : null}
      {review.content ? <p className="text-sm whitespace-pre-line text-ink-muted">{review.content}</p> : null}

      {review.media.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {review.media.map((media, index) => (
            <MediaThumb
              key={media.id}
              media={media}
              label={media.type === "video" ? t.reviews.openVideo(index + 1) : t.reviews.openPhoto(index + 1)}
              onClick={() => onOpenMedia(index)}
            />
          ))}
        </div>
      ) : null}

      {review.reply ? (
        <div className="rounded-control border-l-2 border-brand bg-sunken px-4 py-3 text-sm">
          <p className="mb-1 font-medium">{t.reviews.storeReply}</p>
          <p className="whitespace-pre-line text-ink-muted">{review.reply.content}</p>
        </div>
      ) : null}

      {helpful ? (
        <button
          type="button"
          onClick={helpful.onToggle}
          disabled={helpful.pending}
          aria-pressed={helpful.voted}
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60",
            helpful.voted && "border-brand bg-brand-soft text-brand hover:text-brand",
          )}
        >
          <ThumbsUp className={cn("size-3.5", helpful.voted && "fill-current")} aria-hidden />
          {t.reviews.helpful(helpful.count)}
          {helpful.voted ? <span className="sr-only">{t.reviews.helpfulVoted}</span> : null}
        </button>
      ) : null}
    </article>
  );
}
