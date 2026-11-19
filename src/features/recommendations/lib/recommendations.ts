/**
 * Product recommendations of the Headpress `recommendations` module.
 *
 * Headpress answers product ids only, ranked; the products themselves come from the Store API, so
 * prices, images and stock come from the same source as the rest of the catalog.
 */
import type { HeadpressClient, Product } from "@meumouse.com/headpress";

export type RelatedStrategy = "auto" | "upsells" | "bought_together" | "taxonomy" | "cross_sells";

export interface RecommendationItem {
  id: number;
  score: number;
  reason: string;
}

type Client = Pick<HeadpressClient, "request" | "catalog">;

/** Ids related to a product, best first. */
export async function relatedIds(
  hp: Pick<HeadpressClient, "request">,
  productId: number,
  options: { strategy?: RelatedStrategy; limit?: number } = {},
): Promise<number[]> {
  const data = await hp.request<{ items?: RecommendationItem[] }>(`/store/products/${productId}/related`, {
    module: "recommendations",
    query: { strategy: options.strategy, limit: options.limit },
    cacheTags: [`recommendations:product:${productId}`, `product:${productId}`],
  });
  return (data.items ?? []).map((item) => item.id);
}

/** Ids for the cart (cross-sells, then bought together) or the home page (best sellers). */
export async function contextIds(
  hp: Pick<HeadpressClient, "request">,
  context: "cart" | "home",
  options: { productIds?: readonly number[]; limit?: number } = {},
): Promise<number[]> {
  const productIds = [...new Set(options.productIds ?? [])].slice(0, 50);
  const data = await hp.request<{ items?: RecommendationItem[] }>("/store/recommendations", {
    module: "recommendations",
    query: { context, product_ids: productIds.length ? productIds : undefined, limit: options.limit },
    cacheTags:
      context === "home"
        ? ["recommendations:home"]
        : productIds.map((id) => `recommendations:product:${id}`),
  });
  return (data.items ?? []).map((item) => item.id);
}

/** The products of a list of ids, in that order. */
export async function productsByIds(hp: Pick<Client, "catalog">, ids: readonly number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const page = await hp.catalog.list({ include: ids, orderby: "include", perPage: Math.min(ids.length, 100) });
  const byId = new Map(page.items.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((product): product is Product => product !== undefined);
}

/** Whether a suggestion can go to the cart with one click, without choosing options. */
export function addableDirectly(product: Pick<Product, "type" | "stock">): boolean {
  return product.type === "simple" && product.stock.purchasable && product.stock.inStock;
}

const ALL_STRATEGIES = ["upsells", "bought_together", "taxonomy", "cross_sells", "best_sellers"];

/** The enabled strategies, from the store config (every one when the store does not say). */
function enabledStrategies(hp: Pick<HeadpressClient, "capabilities">): Set<string> | null {
  const config = hp.capabilities.get("recommendations") as { strategies?: unknown } | undefined;
  if (!config) return null;
  return new Set(Array.isArray(config.strategies) ? config.strategies.map(String) : ALL_STRATEGIES);
}

/**
 * What the product page shows: products bought together with this one, then related products
 * (upsells, bought together, same categories). Null while the module is off.
 */
export async function productRecommendations(
  hp: Client & Pick<HeadpressClient, "config" | "capabilities">,
  productId: number,
  limits: { together: number; related: number },
): Promise<{ together: Product[]; related: Product[] } | null> {
  await hp.config.get();
  const strategies = enabledStrategies(hp);
  if (!strategies) return null;

  const [togetherIds, autoIds] = await Promise.all([
    strategies.has("bought_together")
      ? relatedIds(hp, productId, { strategy: "bought_together", limit: limits.together })
      : Promise.resolve([]),
    relatedIds(hp, productId, { limit: limits.related + limits.together }),
  ]);
  const shown = new Set(togetherIds);
  const relatedOnly = autoIds.filter((id) => !shown.has(id)).slice(0, limits.related);
  const products = await productsByIds(hp, [...togetherIds, ...relatedOnly]);
  const byId = new Map(products.map((product) => [product.id, product]));
  const pick = (ids: number[]) => ids.map((id) => byId.get(id)).filter((product) => product !== undefined);

  return { together: pick(togetherIds), related: pick(relatedOnly) };
}

/** Best sellers for the home page. Empty while the module (or its `best_sellers` source) is off. */
export async function homeBestSellers(
  hp: Client & Pick<HeadpressClient, "config" | "capabilities">,
  limit: number,
): Promise<Product[]> {
  await hp.config.get();
  const strategies = enabledStrategies(hp);
  if (!strategies?.has("best_sellers")) return [];
  return productsByIds(hp, await contextIds(hp, "home", { limit }));
}
