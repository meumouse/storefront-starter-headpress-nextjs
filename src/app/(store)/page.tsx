import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { ProductGrid } from "@/features/catalog/components/ProductCard";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { t } from "@/i18n";
import { readOr, safeRead } from "@/lib/headpress/safe-read";

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          {t.catalog.viewAll}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    safeRead((hp) => hp.catalog.list({ featured: true, perPage: 4 })),
    readOr(null, (hp) => hp.catalog.list({ orderby: "date", order: "desc", perPage: 4 })),
    readOr([], (hp) => hp.catalog.categories({ hideEmpty: true })),
  ]);

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="flex flex-col items-start gap-5 py-16 sm:py-24">
          <p className="text-sm font-medium text-brand">{t.catalog.heroEyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-semibold sm:text-6xl">{t.catalog.heroTitle}</h1>
          <p className="max-w-xl text-lg text-ink-muted">{t.catalog.heroDescription}</p>
          <Button asChild size="lg">
            <Link href={paths.shop}>{t.catalog.heroAction}</Link>
          </Button>
        </Container>
      </section>

      {!featured.ok ? (
        <StoreUnavailable />
      ) : (
        <Container className="flex flex-col gap-14 py-14">
          {categories.length > 0 ? (
            <section className="flex flex-col gap-5">
              <SectionHeading title={t.catalog.categoriesTitle} />
              <div className="grid gap-4 sm:grid-cols-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={paths.category(category.slug)}
                    className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-card bg-sunken"
                  >
                    {category.image ? (
                      <ProductImage
                        src={category.image.src}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    <span className="relative m-3 rounded-control bg-surface px-3 py-1.5 text-sm font-medium">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {featured.data.items.length > 0 ? (
            <section className="flex flex-col gap-5">
              <SectionHeading title={t.catalog.featuredTitle} href={paths.shop} />
              <ProductGrid products={featured.data.items} />
            </section>
          ) : null}

          {latest && latest.items.length > 0 ? (
            <section className="flex flex-col gap-5">
              <SectionHeading title={t.catalog.newArrivalsTitle} href={paths.shop} />
              <ProductGrid products={latest.items} />
            </section>
          ) : null}
        </Container>
      )}
    </>
  );
}
