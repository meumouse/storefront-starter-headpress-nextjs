"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/field";
import { t } from "@/i18n";

import { listingHref, SORT_OPTIONS, type ListingParams, type SortOption } from "../lib/listing-query";

const LABELS: Record<SortOption, string> = {
  latest: t.catalog.sortLatest,
  popular: t.catalog.sortPopular,
  rating: t.catalog.sortRating,
  "price-asc": t.catalog.sortPriceAsc,
  "price-desc": t.catalog.sortPriceDesc,
};

export function SortSelect({
  basePath,
  params,
  value,
}: {
  basePath: string;
  params: ListingParams;
  value: SortOption;
}) {
  const router = useRouter();

  return (
    <Select
      aria-label={t.catalog.sortLabel}
      className="h-10 w-auto"
      value={value}
      onChange={(event) =>
        router.push(listingHref(basePath, params, { sort: event.target.value === "latest" ? undefined : event.target.value }))
      }
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {LABELS[option]}
        </option>
      ))}
    </Select>
  );
}
