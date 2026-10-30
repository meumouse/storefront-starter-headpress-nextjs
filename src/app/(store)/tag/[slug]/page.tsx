import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { Container, PageHeading } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { CatalogListing } from "@/features/catalog/components/CatalogListing";
import type { ListingParams } from "@/features/catalog/lib/listing-query";
import { safeRead } from "@/lib/headpress/safe-read";

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingParams>;
}

async function readTag(slug: string) {
  return safeRead(async (hp) => (await hp.catalog.tags()).find((tag) => tag.slug === slug) ?? null);
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = await readTag((await params).slug);
  return { title: tag.ok ? tag.data?.name : undefined };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const tag = await readTag(slug);

  if (!tag.ok) return <StoreUnavailable />;
  if (!tag.data) notFound();

  return (
    <Container className="flex flex-col gap-8 py-10">
      <PageHeading title={tag.data.name} description={tag.data.description || undefined} />
      <CatalogListing basePath={paths.tag(slug)} params={await searchParams} fixed={{ tag: tag.data.id }} />
    </Container>
  );
}
