import type { MetadataRoute } from "next";

import { paths } from "@/config/routes";
import { publicEnv } from "@/lib/env";
import { readOr } from "@/lib/headpress/safe-read";

export const revalidate = 3600;

const SITEMAP_LIMIT = 100;

/** A sitemap of the catalog. Stores with larger catalogs can serve Headpress's `hp.seo.sitemapIndex()`. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${publicEnv.siteUrl}${path}`;

  const [products, categories] = await Promise.all([
    readOr([], async (hp) => (await hp.catalog.list({ perPage: SITEMAP_LIMIT })).items),
    readOr([], (hp) => hp.catalog.categories({ hideEmpty: true })),
  ]);

  return [
    { url: url(paths.home) },
    { url: url(paths.shop) },
    { url: url(paths.blog) },
    ...categories.map((category) => ({ url: url(paths.category(category.slug)) })),
    ...products.map((product) => ({ url: url(paths.product(product.slug)) })),
  ];
}
