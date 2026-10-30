import { toMajor, type Product } from "@meumouse.com/headpress";

import { paths } from "@/config/routes";
import { publicEnv } from "@/lib/env";

/** schema.org Product data, safe inside a `<script>` tag. */
export function productJsonLd(product: Product): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku || undefined,
    image: product.images.map((image) => image.src),
    description: product.shortDescription.replace(/<[^>]+>/g, "").trim() || undefined,
    aggregateRating:
      product.rating.count > 0
        ? { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count }
        : undefined,
    offers: {
      "@type": "Offer",
      url: `${publicEnv.siteUrl}${paths.product(product.slug)}`,
      priceCurrency: product.price.currency,
      price: toMajor(product.price),
      availability: `https://schema.org/${product.stock.inStock ? "InStock" : "OutOfStock"}`,
    },
  };

  return JSON.stringify(data).replace(/</g, "\\u003c");
}
