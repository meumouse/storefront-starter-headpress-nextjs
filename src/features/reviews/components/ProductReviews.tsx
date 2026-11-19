import { Suspense } from "react";

import { Skeleton } from "@/components/ui/feedback";
import { readOr } from "@/lib/headpress/safe-read";

import { ReviewsSection, type InitialReviews } from "./ReviewsSection";

/**
 * The reviews block of the product page. The server reads the summary, the first page and the
 * customers' photos and videos, so they are in the HTML; filters, votes and the form run in the
 * browser. Renders nothing while the `reviews` module is off or WordPress does not answer.
 */
export async function ProductReviews({ productId }: { productId: number }) {
  const initial = await readOr<InitialReviews | null>(null, async (hp) => {
    await hp.config.get();
    const config = hp.capabilities.get("reviews");
    if (!config) return null;

    const summary = await hp.reviews.summary(productId);
    const [page, gallery] = await Promise.all([
      hp.reviews.list(productId, { perPage: config.per_page }),
      summary.with_media > 0 ? hp.reviews.media(productId, { perPage: 20 }).then((media) => media.items) : [],
    ]);
    return { summary, page, gallery };
  });

  if (!initial) return null;

  return (
    // The section reads `?review=1`, which needs a boundary to prerender.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <ReviewsSection productId={productId} initial={initial} />
    </Suspense>
  );
}
