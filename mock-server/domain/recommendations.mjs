/**
 * What the `recommendations` module would have counted from paid orders. The demo's pairs are
 * fixed, so the product page always has something bought together.
 */
import { products } from "../data/products.mjs";

const BOUGHT_TOGETHER = {
  101: [105, 103, 102],
  102: [109, 101],
  103: [101, 106],
  104: [105, 106],
  105: [106, 104, 101],
  106: [105, 104],
  107: [108, 110],
  108: [110, 107],
  109: [102, 105],
  110: [108, 107],
};

const CROSS_SELLS = { 104: [106], 107: [110] };

function sameCategory(id) {
  const product = products.find((entry) => entry.id === id);
  return products.filter((entry) => entry.category === product?.category && entry.id !== id).map((entry) => entry.id);
}

function unique(ids, exclude, limit) {
  return [...new Set(ids)].filter((id) => !exclude.includes(id)).slice(0, limit);
}

function items(ids, reason) {
  return ids.map((id, index) => ({ id, score: Math.round((1 - index / (ids.length + 1)) * 100) / 100, reason }));
}

export function related(productId, strategy, limit) {
  const together = BOUGHT_TOGETHER[productId] ?? [];
  if (strategy === "bought_together") return items(unique(together, [productId], limit), "bought_together");
  if (strategy === "taxonomy") return items(unique(sameCategory(productId), [productId], limit), "taxonomy");
  if (strategy === "cross_sells") return items(unique(CROSS_SELLS[productId] ?? [], [productId], limit), "cross_sells");
  if (strategy === "upsells") return [];
  const ids = unique([...together, ...sameCategory(productId)], [productId], limit);
  return ids.map((id) => ({ ...items([id], together.includes(id) ? "bought_together" : "taxonomy")[0] }));
}

export function forContext(context, productIds, limit) {
  if (context === "home") {
    const ranked = [...products].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating);
    return items(ranked.slice(0, limit).map((product) => product.id), "best_sellers");
  }
  const ids = productIds.flatMap((id) => [...(CROSS_SELLS[id] ?? []), ...(BOUGHT_TOGETHER[id] ?? [])]);
  return items(unique(ids, productIds, limit), "bought_together");
}
