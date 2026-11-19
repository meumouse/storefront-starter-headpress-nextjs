/**
 * Reviews with photos and videos, helpful votes and uploads, kept in memory like a store's
 * `reviews` module would keep them in WordPress.
 */
import { randomUUID } from "node:crypto";

import { products, reviewAuthors, reviewTexts } from "../data/products.mjs";

/** Uploaded files, served back from `/mock/uploads/:id`. */
const uploads = new Map();
const reviews = new Map();
/** review id → voter ids. */
const votes = new Map();
let nextReviewId = 5000;
let nextMediaId = 9000;

function seedMedia(baseUrl, product, index) {
  // The first review of each product with reviews has two customer photos.
  if (index !== 0) return [];
  return [0, 1].map((offset) => {
    const url = `${baseUrl}/media/review-${product.slug}-${offset}.svg?hue=${(product.hue + 40 * (offset + 1)) % 360}`;
    return {
      id: product.id * 100 + offset,
      type: "image",
      url,
      mime_type: "image/svg+xml",
      width: 800,
      height: 800,
      sizes: { thumbnail: { url, width: 150, height: 150 } },
      duration: null,
    };
  });
}

function seed(baseUrl) {
  if (reviews.size > 0) return;
  for (const product of products) {
    const list = Array.from({ length: product.reviews }, (_, index) => ({
      id: product.id * 10 + index,
      product_id: product.id,
      rating: Math.max(1, Math.min(5, Math.round(product.rating) - (index === 2 ? 1 : 0))),
      title: index === 0 ? "Just as described" : "",
      content: reviewTexts[index % reviewTexts.length],
      author: { name: reviewAuthors[index % reviewAuthors.length], anonymous: false, avatar: null },
      verified: index !== 1,
      created_at: new Date(Date.UTC(2026, 8, 20 - index * 6, 12)).toISOString(),
      media: seedMedia(baseUrl, product, index),
      helpful_count: index === 0 ? 4 : index,
      reply:
        index === 0
          ? { content: "Thank you! We are glad it arrived well.", created_at: "2026-09-21T10:00:00Z", author: { name: "Kestrel & Co." } }
          : null,
    }));
    reviews.set(product.id, list);
  }
}

const SORTS = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  oldest: (a, b) => a.created_at.localeCompare(b.created_at),
  rating_desc: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  rating_asc: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
  most_helpful: (a, b) => b.helpful_count - a.helpful_count,
};

export function listReviews(baseUrl, productId, params) {
  seed(baseUrl);
  const ratings = (params.get("rating") ?? "").split(",").filter(Boolean).map(Number);
  const found = (reviews.get(productId) ?? [])
    .filter((review) => ratings.length === 0 || ratings.includes(review.rating))
    .filter((review) => params.get("with_media") !== "true" || review.media.length > 0)
    .filter((review) => params.get("verified") !== "true" || review.verified)
    .sort(SORTS[params.get("sort") ?? "newest"] ?? SORTS.newest);
  const perPage = Number(params.get("per_page") ?? 10);
  const page = Number(params.get("page") ?? 1);
  return { items: found.slice((page - 1) * perPage, page * perPage), total: found.length, perPage };
}

export function reviewSummary(baseUrl, productId) {
  seed(baseUrl);
  const list = reviews.get(productId) ?? [];
  const rated = list.filter((review) => review.rating);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of rated) distribution[review.rating] += 1;
  return {
    product_id: productId,
    average: rated.length ? Math.round((rated.reduce((sum, review) => sum + review.rating, 0) / rated.length) * 100) / 100 : 0,
    count: list.length,
    rated: rated.length,
    distribution,
    with_media: list.filter((review) => review.media.length > 0).length,
    verified: list.filter((review) => review.verified).length,
    reviews_allowed: true,
  };
}

export function reviewMedia(baseUrl, productId) {
  seed(baseUrl);
  return (reviews.get(productId) ?? []).flatMap((review) => review.media.map((media) => ({ ...media, review_id: review.id })));
}

/** The demo customer can review anything once; guests are asked to sign in. */
export function eligibility(productId, customerId) {
  if (!customerId) return { can_review: false, reason: "login_required", verified: null };
  const mine = (reviews.get(productId) ?? []).some((review) => review.customer_id === customerId);
  return mine
    ? { can_review: false, reason: "already_reviewed", verified: true }
    : { can_review: true, reason: null, verified: true };
}

export function votedIds(productId, voter) {
  return (reviews.get(productId) ?? []).filter((review) => votes.get(review.id)?.has(voter)).map((review) => review.id);
}

export function vote(reviewId, voter, helpful) {
  const review = [...reviews.values()].flat().find((entry) => entry.id === reviewId);
  if (!review) return null;
  const voters = votes.get(reviewId) ?? new Set();
  const had = voters.has(voter);
  if (helpful && !had) {
    voters.add(voter);
    review.helpful_count += 1;
  } else if (!helpful && had) {
    voters.delete(voter);
    review.helpful_count = Math.max(0, review.helpful_count - 1);
  }
  votes.set(reviewId, voters);
  return { id: reviewId, helpful_count: review.helpful_count, voted: voters.has(voter) };
}

export async function storeUpload(baseUrl, file) {
  const id = nextMediaId++;
  const type = file.type.startsWith("video/") ? "video" : "image";
  const bytes = Buffer.from(await file.arrayBuffer());
  uploads.set(String(id), { bytes, mime: file.type || "application/octet-stream" });
  const url = `${baseUrl}/mock/uploads/${id}`;
  return {
    id,
    type,
    url,
    mime_type: file.type,
    width: null,
    height: null,
    sizes: type === "image" ? { thumbnail: { url, width: 150, height: 150 } } : {},
    duration: null,
    token: randomUUID(),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  };
}

export function readUpload(id) {
  return uploads.get(id) ?? null;
}

export function createReview(baseUrl, productId, customer, body, pendingUploads) {
  seed(baseUrl);
  const review = {
    id: nextReviewId++,
    product_id: productId,
    customer_id: customer.id,
    rating: body.rating ?? null,
    title: body.title ?? "",
    content: body.content ?? "",
    author: {
      name: body.anonymous ? null : `${customer.first_name} ${customer.last_name.charAt(0)}.`.trim(),
      anonymous: Boolean(body.anonymous),
      avatar: null,
    },
    verified: true,
    created_at: new Date().toISOString(),
    media: (body.media ?? []).map((entry) => pendingUploads.get(entry.id)).filter(Boolean),
    helpful_count: 0,
    reply: null,
  };
  reviews.set(productId, [review, ...(reviews.get(productId) ?? [])]);
  return review;
}

export const REVIEW_PRODUCTS = new Set(products.map((product) => product.id));
