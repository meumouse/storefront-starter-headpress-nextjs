import type { Metadata } from "next";

import { Container, PageHeading } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { CatalogListing } from "@/features/catalog/components/CatalogListing";
import type { ListingParams } from "@/features/catalog/lib/listing-query";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.catalog.shopTitle };

export default async function ShopPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <PageHeading title={t.catalog.shopTitle} description={t.catalog.shopDescription} />
      <CatalogListing basePath={paths.shop} params={await searchParams} showCategories />
    </Container>
  );
}
