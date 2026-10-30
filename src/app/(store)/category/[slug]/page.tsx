import { seoMetadata } from "@meumouse.com/headpress/next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { Container, PageHeading } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { CatalogListing } from "@/features/catalog/components/CatalogListing";
import type { ListingParams } from "@/features/catalog/lib/listing-query";
import { safeRead } from "@/lib/headpress/safe-read";
import { getServerClient } from "@/lib/headpress/server";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingParams>;
}

async function readCategory(slug: string) {
  return safeRead(async (hp) => {
    const categories = await hp.catalog.categories();
    return categories.find((category) => category.slug === slug) ?? null;
  });
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await readCategory(slug);
  return seoMetadata(getServerClient(), { path: paths.category(slug) }, {
    title: category.ok ? category.data?.name : undefined,
  });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = await readCategory(slug);

  if (!category.ok) return <StoreUnavailable />;
  if (!category.data) notFound();

  return (
    <Container className="flex flex-col gap-8 py-10">
      <PageHeading title={category.data.name} description={category.data.description || undefined} />
      <CatalogListing
        basePath={paths.category(slug)}
        params={await searchParams}
        fixed={{ category: category.data.id }}
      />
    </Container>
  );
}
