/**
 * What the `recommendations` module would have counted from paid orders. The demo's pairs are
 * fixed, so the product page always has something bought together.
 */
import { products } from "../data/products.mjs";

const BOUGHT_TOGETHER = {
  101: [106, 107, 123],
  102: [107, 123, 106],
  103: [107, 123],
  104: [107, 126],
  105: [107, 113],
  106: [101, 107],
  107: [101, 106],
  108: [112, 122],
  109: [112, 122],
  110: [123, 122],
  111: [112, 115],
  112: [111, 113],
  113: [129, 112],
  114: [115, 117, 125],
  115: [114, 117],
  116: [117, 114],
  117: [114, 115],
  118: [119],
  119: [118],
  120: [121, 118],
  121: [120],
  122: [123, 108],
  123: [101, 122],
  124: [125, 122],
  125: [124, 114],
  126: [101, 127],
  127: [126],
  128: [113, 129],
  129: [113, 128],
};

/** What the merchant set as cross-sells: the accessories of each device. */
const CROSS_SELLS = { 101: [106, 107], 102: [106, 107], 114: [115], 128: [113] };

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
