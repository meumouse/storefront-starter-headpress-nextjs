import type { Product } from "@meumouse.com/headpress";
import { seoMetadata } from "@meumouse.com/headpress/next";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { Container } from "@/components/ui/layout";
import { Rating } from "@/components/ui/rating";
import { paths } from "@/config/routes";
import { ProductGrid } from "@/features/catalog/components/ProductCard";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import { ProductPurchase, type ClientProduct } from "@/features/catalog/components/ProductPurchase";
import { ProductReviews } from "@/features/catalog/components/ProductReviews";
import { productJsonLd } from "@/features/catalog/lib/json-ld";
import { ContentBody } from "@/features/content/components/ContentBody";
import { t } from "@/i18n";
import { readOr, safeRead } from "@/lib/headpress/safe-read";
import { getServerClient } from "@/lib/headpress/server";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

function toClientProduct(product: Product): ClientProduct {
  const client: Partial<Product> = { ...product };
  delete client.raw;
  return client as ClientProduct;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await safeRead((hp) => hp.catalog.get(slug));
  const data = product.ok ? product.data : null;

  return seoMetadata(getServerClient(), { path: paths.product(slug) }, {
    title: data?.name,
    description: data?.shortDescription.replace(/<[^>]+>/g, "").trim() || undefined,
    openGraph: data?.images[0] ? { images: [data.images[0].src] } : undefined,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await safeRead((hp) => hp.catalog.get(slug));

  if (!result.ok) return <StoreUnavailable />;
  if (!result.data) notFound();

  const product = result.data;
  const primaryCategory = product.categories[0];

  const [variations, related] = await Promise.all([
    product.type === "variable" ? readOr([], (hp) => hp.catalog.variations(product.id)) : Promise.resolve([]),
    primaryCategory
      ? readOr(null, (hp) =>
          hp.catalog.list({ category: primaryCategory.id, exclude: [product.id], perPage: 4 }),
        )
      : Promise.resolve(null),
  ]);

  return (
    <Container className="flex flex-col gap-14 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product) }} />

      <nav aria-label={t.catalog.breadcrumbLabel} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={paths.home} className="hover:text-ink">
              {t.catalog.breadcrumbHome}
            </Link>
          </li>
          {primaryCategory ? (
            <li className="before:mr-1.5 before:content-['/']">
              <Link href={paths.category(primaryCategory.slug)} className="hover:text-ink">
                {primaryCategory.name}
              </Link>
            </li>
          ) : null}
          <li aria-current="page" className="text-ink before:mr-1.5 before:text-ink-muted before:content-['/']">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">{product.name}</h1>
            {product.rating.count > 0 ? (
              <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <Rating value={product.rating.average} label={t.catalog.ratingLabel(product.rating.average)} />
                {t.catalog.reviewCount(product.rating.count)}
              </a>
            ) : null}
          </div>
          {product.shortDescription ? <ContentBody html={product.shortDescription} /> : null}
          <ProductPurchase product={toClientProduct(product)} variations={variations.map(toClientProduct)} />
          {product.sku ? <p className="text-xs text-ink-subtle">{t.catalog.sku(product.sku)}</p> : null}
        </div>
      </div>

      {product.description ? (
        <section className="flex max-w-3xl flex-col gap-3">
          <h2 className="text-xl font-semibold">{t.catalog.descriptionTitle}</h2>
          <ContentBody html={product.description} />
        </section>
      ) : null}

      <div id="reviews" className="max-w-3xl">
        <ProductReviews product={product} />
      </div>

      {related && related.items.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold">{t.catalog.relatedTitle}</h2>
          <ProductGrid products={related.items} />
        </section>
      ) : null}
    </Container>
  );
}
