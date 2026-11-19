import { redirect } from "next/navigation";

import { paths } from "@/config/routes";
import { REVIEW_PARAM } from "@/features/reviews/lib/review-link";

/** The `product_review` route of review requests: the product page, with the form open. */
export default async function ProductReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`${paths.product(slug)}?${REVIEW_PARAM}=1#reviews`);
}
