import type { Product } from "@meumouse.com/headpress";

import { Badge } from "@/components/ui/feedback";
import { Rating } from "@/components/ui/rating";
import { t } from "@/i18n";
import { readOr } from "@/lib/headpress/safe-read";

/** Approved reviews. Renders nothing while the `reviews` module is off. */
export async function ProductReviews({ product }: { product: Pick<Product, "id" | "rating"> }) {
  const reviews = await readOr(null, async (hp) => {
    await hp.config.get();
    return hp.capabilities.has("reviews") ? hp.reviews.list(product.id, { perPage: 5 }) : null;
  });

  if (!reviews) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{t.catalog.reviewsTitle}</h2>
        {product.rating.count > 0 ? (
          <>
            <Rating value={product.rating.average} label={t.catalog.ratingLabel(product.rating.average)} />
            <span className="text-sm text-ink-muted">{t.catalog.reviewCount(reviews.total)}</span>
          </>
        ) : null}
      </div>

      {reviews.items.length === 0 ? <p className="text-sm text-ink-muted">{t.catalog.noReviews}</p> : null}

      <ul className="flex flex-col divide-y divide-line">
        {reviews.items.map((review) => (
          <li key={review.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {review.rating ? <Rating value={review.rating} label={t.catalog.ratingLabel(review.rating)} /> : null}
              <span className="text-sm font-medium">{review.author.name}</span>
              {review.verified ? <Badge tone="success">{t.catalog.verifiedPurchase}</Badge> : null}
            </div>
            {review.title ? <p className="font-medium">{review.title}</p> : null}
            <p className="text-sm whitespace-pre-line text-ink-muted">{review.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
