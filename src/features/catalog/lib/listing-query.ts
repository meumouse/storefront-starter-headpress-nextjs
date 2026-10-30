import type { ProductOrderBy, ProductQuery } from "@meumouse.com/headpress";

import { siteConfig } from "@/config/site";

/** Query string of a listing page, as the App Router hands it over. */
export type ListingParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS = ["latest", "popular", "rating", "price-asc", "price-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

const SORTING: Record<SortOption, { orderby: ProductOrderBy; order: "asc" | "desc" }> = {
  latest: { orderby: "date", order: "desc" },
  popular: { orderby: "popularity", order: "desc" },
  rating: { orderby: "rating", order: "desc" },
  "price-asc": { orderby: "price", order: "asc" },
  "price-desc": { orderby: "price", order: "desc" },
};

const ATTRIBUTE_PREFIX = "attr_";

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sortOf(params: ListingParams): SortOption {
  return SORT_OPTIONS.find((option) => option === single(params.sort)) ?? "latest";
}

export function pageOf(params: ListingParams): number {
  const page = Number(single(params.page));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function isOnSale(params: ListingParams): boolean {
  return single(params.on_sale) === "1";
}

/** Selected term slugs of an attribute taxonomy (`?attr_pa_color=sand`). */
export function selectedTerms(params: ListingParams, taxonomy: string): string[] {
  const value = params[`${ATTRIBUTE_PREFIX}${taxonomy}`];
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(",")).filter(Boolean);
}

/** The Store API query of a listing: filters from the URL over what the page fixes. */
export function toProductQuery(params: ListingParams, fixed: ProductQuery = {}): ProductQuery {
  const attributes = Object.keys(params)
    .filter((key) => key.startsWith(ATTRIBUTE_PREFIX))
    .map((key) => {
      const attribute = key.slice(ATTRIBUTE_PREFIX.length);
      return { attribute, terms: selectedTerms(params, attribute), operator: "in" as const };
    })
    .filter((filter) => filter.terms.length > 0);

  return {
    ...fixed,
    ...SORTING[sortOf(params)],
    page: pageOf(params),
    perPage: siteConfig.catalog.perPage,
    ...(isOnSale(params) ? { onSale: true } : {}),
    ...(attributes.length > 0 ? { attributes } : {}),
  };
}

function toSearch(params: ListingParams): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value.join(",") : value;
    if (text) search.set(key, text);
  }
  return search;
}

/** A listing URL with some parameters changed. Any filter change goes back to page 1. */
export function listingHref(basePath: string, params: ListingParams, changes: ListingParams): string {
  const next = toSearch({ ...params, page: undefined, ...changes });
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** The URL with a term switched on or off. */
export function toggleTermHref(basePath: string, params: ListingParams, taxonomy: string, slug: string): string {
  const selected = selectedTerms(params, taxonomy);
  const terms = selected.includes(slug) ? selected.filter((term) => term !== slug) : [...selected, slug];
  return listingHref(basePath, params, { [`${ATTRIBUTE_PREFIX}${taxonomy}`]: terms.join(",") || undefined });
}

export function hasActiveFilters(params: ListingParams): boolean {
  return isOnSale(params) || Object.keys(params).some((key) => key.startsWith(ATTRIBUTE_PREFIX));
}

/** The URL without filters, keeping what is not one (`q`, `sort`). */
export function clearFiltersHref(basePath: string, params: ListingParams): string {
  const kept = Object.fromEntries(
    Object.entries(params).filter(([key]) => !key.startsWith(ATTRIBUTE_PREFIX) && key !== "on_sale"),
  );
  return listingHref(basePath, kept, {});
}
