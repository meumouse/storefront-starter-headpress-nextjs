import type { Product } from "@meumouse.com/headpress";
import Link from "next/link";

import { Badge } from "@/components/ui/feedback";
import { Rating } from "@/components/ui/rating";
import { paths } from "@/config/routes";
import { t } from "@/i18n";

import { ProductImage } from "./ProductImage";
import { ProductPrice } from "./ProductPrice";

/** `lcp` is the one image worth a high fetch priority; `eager` skips lazy loading above the fold. */
export type CardImageLoading = "lcp" | "eager" | "lazy";

export function ProductCard({ product, imageLoading = "lazy" }: { product: Product; imageLoading?: CardImageLoading }) {
  const image = product.images[0];

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card bg-sunken">
        {image ? (
          <ProductImage
            src={image.src}
            alt={image.alt || product.name}
            fill
            loading={imageLoading === "lazy" ? undefined : "eager"}
            fetchPriority={imageLoading === "lcp" ? "high" : undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {!product.stock.inStock ? <Badge>{t.catalog.soldOutBadge}</Badge> : null}
          {product.onSale ? <Badge tone="sale">{t.catalog.onSaleBadge}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">
          <Link href={paths.product(product.slug)} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        {product.rating.count > 0 ? (
          <Rating value={product.rating.average} label={t.catalog.ratingLabel(product.rating.average)} />
        ) : null}
        <ProductPrice product={product} />
      </div>
    </article>
  );
}

/** Pass `aboveFold` only where the grid opens the page; elsewhere every image loads lazily. */
export function ProductGrid({ products, aboveFold = false }: { products: Product[]; aboveFold?: boolean }) {
  const loadingFor = (index: number): CardImageLoading =>
    !aboveFold || index >= 4 ? "lazy" : index === 0 ? "lcp" : "eager";

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} imageLoading={loadingFor(index)} />
      ))}
    </div>
  );
}
