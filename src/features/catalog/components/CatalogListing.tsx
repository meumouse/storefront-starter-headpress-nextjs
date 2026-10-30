import type { ProductQuery } from "@meumouse.com/headpress";
import { SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { paths } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { t } from "@/i18n";
import { readOr, safeRead } from "@/lib/headpress/safe-read";
import { cn } from "@/lib/utils";

import {
  clearFiltersHref,
  hasActiveFilters,
  isOnSale,
  listingHref,
  selectedTerms,
  sortOf,
  toggleTermHref,
  toProductQuery,
  type ListingParams,
} from "../lib/listing-query";
import { ProductGrid } from "./ProductCard";
import { SortSelect } from "./SortSelect";

function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-ink bg-ink text-ink-inverse" : "border-line-strong hover:bg-sunken",
      )}
    >
      {children}
    </Link>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">{children}</div>
    </div>
  );
}

/** The attributes the store offers as filters, with their terms. */
async function filterAttributes() {
  return readOr([], async (hp) => {
    const attributes = await hp.catalog.attributes();
    const wanted = attributes.filter((attribute) =>
      (siteConfig.catalog.filterAttributes as readonly string[]).includes(attribute.taxonomy),
    );
    return Promise.all(
      wanted.map(async (attribute) => ({ ...attribute, terms: await hp.catalog.attributeTerms(attribute.id) })),
    );
  });
}

/**
 * A product listing whose state lives in the URL: filters and sorting are plain links, so listings
 * are crawlable, shareable and work without JavaScript.
 */
export async function CatalogListing({
  basePath,
  params,
  fixed,
  showCategories = false,
}: {
  basePath: string;
  params: ListingParams;
  /** What the page itself selects: a category, a tag, a search. */
  fixed?: ProductQuery;
  showCategories?: boolean;
}) {
  const [result, attributes, categories] = await Promise.all([
    safeRead((hp) => hp.catalog.list(toProductQuery(params, fixed))),
    filterAttributes(),
    showCategories ? readOr([], (hp) => hp.catalog.categories({ hideEmpty: true })) : Promise.resolve([]),
  ]);

  if (!result.ok) return <StoreUnavailable />;

  const { items, total, totalPages, page } = result.data;

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <aside aria-label={t.catalog.filtersTitle} className="flex flex-col gap-6">
        {categories.length > 0 ? (
          <FilterGroup title={t.catalog.filterCategories}>
            {categories.map((category) => (
              <FilterChip key={category.id} href={paths.category(category.slug)} active={false}>
                {category.name}
              </FilterChip>
            ))}
          </FilterGroup>
        ) : null}
        {attributes.map((attribute) => (
          <FilterGroup key={attribute.id} title={attribute.name}>
            {attribute.terms.map((term) => (
              <FilterChip
                key={term.id}
                href={toggleTermHref(basePath, params, attribute.taxonomy, term.slug)}
                active={selectedTerms(params, attribute.taxonomy).includes(term.slug)}
              >
                {term.name}
              </FilterChip>
            ))}
          </FilterGroup>
        ))}
        <div>
          <FilterChip
            href={listingHref(basePath, params, { on_sale: isOnSale(params) ? undefined : "1" })}
            active={isOnSale(params)}
          >
            {t.catalog.filterOnSale}
          </FilterChip>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">{t.catalog.productCount(total)}</p>
          <SortSelect basePath={basePath} params={params} value={sortOf(params)} />
        </div>

        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState
            icon={<SearchX />}
            title={t.catalog.noProductsTitle}
            description={t.catalog.noProductsDescription}
            action={
              hasActiveFilters(params) ? (
                <Button asChild variant="secondary">
                  <Link href={clearFiltersHref(basePath, params)}>{t.catalog.clearFilters}</Link>
                </Button>
              ) : null
            }
          />
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          href={(target) => listingHref(basePath, params, { page: target > 1 ? String(target) : undefined })}
          label={t.catalog.paginationLabel}
          previousLabel={t.catalog.previousPage}
          nextLabel={t.catalog.nextPage}
        />
      </div>
    </div>
  );
}
