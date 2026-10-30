import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/feedback";
import { Container, PageHeading } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { CatalogListing } from "@/features/catalog/components/CatalogListing";
import type { ListingParams } from "@/features/catalog/lib/listing-query";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.catalog.searchOpen, robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  return (
    <Container className="flex flex-col gap-8 py-10">
      {query ? (
        <>
          <PageHeading title={t.catalog.searchTitle(query)} />
          <CatalogListing basePath={paths.search} params={params} fixed={{ search: query }} />
        </>
      ) : (
        <EmptyState title={t.catalog.searchOpen} description={t.catalog.searchEmptyQuery} />
      )}
    </Container>
  );
}
