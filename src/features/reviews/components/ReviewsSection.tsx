"use client";

import type { Review, ReviewMedia, ReviewSort, ReviewSummary as Summary } from "@meumouse.com/headpress";
import { useCapability, useHeadpress, useSignedIn } from "@meumouse.com/headpress/react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PenLine, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

import { REVIEW_PARAM } from "../lib/review-link";
import { ReviewDialog } from "./ReviewDialog";
import { MediaThumb, ReviewItem } from "./ReviewItem";
import { ReviewLightbox, type LightboxItem } from "./ReviewLightbox";
import { ReviewSummary } from "./ReviewSummary";

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: t.reviews.sortNewest },
  { value: "most_helpful", label: t.reviews.sortHelpful },
  { value: "rating_desc", label: t.reviews.sortHighest },
  { value: "rating_asc", label: t.reviews.sortLowest },
  { value: "oldest", label: t.reviews.sortOldest },
];

interface Filters {
  sort: ReviewSort;
  rating: number | null;
  withMedia: boolean;
  verified: boolean;
}

const DEFAULT_FILTERS: Filters = { sort: "newest", rating: null, withMedia: false, verified: false };

function Chip({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
        active ? "border-brand bg-brand text-on-brand" : "border-line-strong hover:border-brand",
      )}
    >
      {children}
      {active ? <X className="size-3.5" aria-hidden /> : null}
    </button>
  );
}

export interface InitialReviews {
  summary: Summary;
  page: { items: Review[]; total: number; totalPages: number };
  gallery: (ReviewMedia & { review_id?: number })[];
}

export function ReviewsSection({ productId, initial }: { productId: number; initial: InitialReviews }) {
  const hp = useHeadpress();
  const config = useCapability("reviews");
  const signedIn = useSignedIn();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [writing, setWriting] = useState(() => searchParams.get(REVIEW_PARAM) === "1");
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const perPage = config?.per_page ?? 10;
  const filtered = filters.rating !== null || filters.withMedia || filters.verified;
  const isDefault = !filtered && filters.sort === DEFAULT_FILTERS.sort;

  // Drop the parameter once read, so a reload or a shared link does not open the form again.
  useEffect(() => {
    if (searchParams.get(REVIEW_PARAM) !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(REVIEW_PARAM);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}#reviews`, { scroll: false });
    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
  }, [searchParams, pathname, router]);

  const summary = useQuery({
    queryKey: ["reviews", productId, "summary"],
    queryFn: () => hp.reviews.summary(productId),
    initialData: initial.summary,
    staleTime: 60_000,
  });

  const list = useInfiniteQuery({
    queryKey: ["reviews", productId, "list", filters, perPage],
    queryFn: ({ pageParam }) =>
      hp.reviews.list(productId, {
        page: pageParam,
        perPage,
        sort: filters.sort,
        rating: filters.rating ? [filters.rating] : undefined,
        withMedia: filters.withMedia || undefined,
        verified: filters.verified || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (pages.length < last.totalPages ? pages.length + 1 : undefined),
    // The server read the default view; any filter is a fresh read.
    initialData: isDefault ? { pages: [initial.page], pageParams: [1] } : undefined,
    staleTime: 60_000,
  });

  const gallery = useQuery({
    queryKey: ["reviews", productId, "gallery"],
    queryFn: async () => (await hp.reviews.media(productId, { perPage: 20 })).items,
    initialData: initial.gallery,
    staleTime: 60_000,
  });

  const helpfulOn = config?.helpful_enabled !== false && (signedIn || config?.helpful_guests !== false);
  const votes = useQuery({
    queryKey: ["reviews", productId, "votes", signedIn],
    queryFn: () => hp.reviews.votes(productId),
    enabled: helpfulOn,
  });
  const [counts, setCounts] = useState<Record<number, number>>({});
  const vote = useMutation({
    mutationFn: ({ reviewId, helpful }: { reviewId: number; helpful: boolean }) => hp.reviews.vote(reviewId, helpful),
    onSuccess: (result) => {
      setCounts((previous) => ({ ...previous, [result.id]: result.helpful_count }));
      queryClient.setQueryData<number[]>(["reviews", productId, "votes", signedIn], (previous = []) =>
        result.voted ? [...new Set([...previous, result.id])] : previous.filter((id) => id !== result.id),
      );
    },
  });

  const reviews = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  const voted = new Set(votes.data ?? []);
  const data = summary.data;
  const showVerified = config?.show_verified_label !== false;

  const update = (changes: Partial<Filters>) => setFilters((previous) => ({ ...previous, ...changes }));

  const writeButton = data.reviews_allowed ? (
    <Button className="w-full" onClick={() => setWriting(true)}>
      <PenLine aria-hidden />
      {t.reviews.write}
    </Button>
  ) : null;

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-6">
      <h2 id="reviews-title" className="text-xl font-semibold">
        {t.reviews.title}
      </h2>

      {data.count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-sunken px-6 py-10 text-center">
          <p className="font-medium">{t.reviews.emptyTitle}</p>
          <p className="max-w-sm text-sm text-ink-muted">{t.reviews.emptyDescription}</p>
          {writeButton ? <div className="mt-3 w-full max-w-xs">{writeButton}</div> : null}
        </div>
      ) : (
        <>
          <ReviewSummary
            summary={data}
            activeRating={filters.rating}
            onRatingClick={(star) => update({ rating: filters.rating === star ? null : star })}
            action={writeButton}
          />

          {gallery.data.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">{t.reviews.mediaTitle}</h3>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {gallery.data.map((media, index) => (
                  <MediaThumb
                    key={media.id}
                    media={media}
                    label={media.type === "video" ? t.reviews.openVideo(index + 1) : t.reviews.openPhoto(index + 1)}
                    onClick={() => setLightbox({ items: gallery.data, index })}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {data.with_media > 0 ? (
                <Chip active={filters.withMedia} onClick={() => update({ withMedia: !filters.withMedia })}>
                  {t.reviews.filterWithMedia}
                </Chip>
              ) : null}
              {showVerified && data.verified > 0 ? (
                <Chip active={filters.verified} onClick={() => update({ verified: !filters.verified })}>
                  {t.reviews.filterVerified}
                </Chip>
              ) : null}
              {filters.rating ? (
                <Chip active onClick={() => update({ rating: null })}>
                  <span className="sr-only">{t.reviews.removeFilter(t.reviews.starCount(filters.rating))}</span>
                  <span aria-hidden>{t.reviews.starCount(filters.rating)}</span>
                </Chip>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              {t.reviews.sortLabel}
              <Select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value as ReviewSort })}
                className="h-9 w-44"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <p className="text-sm text-ink-muted" aria-live="polite">
            {list.isPending ? t.common.loading : total === 0 ? t.reviews.noMatches : t.reviews.showing(reviews.length, total)}
          </p>

          {list.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {reviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  showVerified={showVerified}
                  showAvatar={Boolean(config?.show_avatars)}
                  onOpenMedia={(index) =>
                    setLightbox({
                      items: review.media.map((media) => ({
                        ...media,
                        caption: { author: review.author.anonymous ? null : review.author.name, rating: review.rating },
                      })),
                      index,
                    })
                  }
                  helpful={
                    helpfulOn
                      ? {
                          voted: voted.has(review.id),
                          count: counts[review.id] ?? review.helpful_count,
                          pending: vote.isPending && vote.variables?.reviewId === review.id,
                          onToggle: () => vote.mutate({ reviewId: review.id, helpful: !voted.has(review.id) }),
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {filtered && total === 0 && !list.isPending ? (
            <Button variant="link" className="self-start px-0" onClick={() => setFilters(DEFAULT_FILTERS)}>
              {t.reviews.clearFilters}
            </Button>
          ) : null}

          {list.hasNextPage ? (
            <Button
              variant="secondary"
              className="self-center"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t.reviews.loadMore}
            </Button>
          ) : null}
        </>
      )}

      <ReviewLightbox
        items={lightbox?.items ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
        onClose={() => setLightbox(null)}
      />
      <ReviewDialog productId={productId} open={writing} onOpenChange={setWriting} />
    </section>
  );
}
