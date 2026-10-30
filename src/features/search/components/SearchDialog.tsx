"use client";

import { highlightSegments, type SearchProduct } from "@meumouse.com/headpress";
import { useSearchBox, useCapability } from "@meumouse.com/headpress/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

function SuggestionRow({ item, onPick }: { item: SearchProduct; onPick: () => void }) {
  return (
    <li>
      <Link
        href={item.path ?? paths.product(item.slug)}
        onClick={onPick}
        className="flex items-center gap-3 rounded-control p-2 transition-colors hover:bg-sunken"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {highlightSegments(item.name, item.highlight.name).map((segment, index) =>
            segment.match ? (
              <mark key={index} className="bg-brand-soft text-ink">
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </span>
        {item.prices ? <span className="text-sm text-ink-muted">{formatPrice(item.prices.price)}</span> : null}
      </Link>
    </li>
  );
}

/** Live suggestions when the `search` module is on; otherwise a plain search box. */
function SearchBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [search, { setQuery }] = useSearchBox({ limit: 6 });
  const searchModule = useCapability("search");
  const items = (search.result?.groups ?? [])
    .flatMap((group) => group.items)
    .filter((item): item is SearchProduct => item.kind === "product");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = search.query.trim();
    if (!query) return;
    onClose();
    router.push(`${paths.search}?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <form role="search" onSubmit={submit}>
        <Input
          autoFocus
          type="search"
          aria-label={t.catalog.searchPlaceholder}
          placeholder={t.catalog.searchPlaceholder}
          value={search.query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      {search.status === "loading" ? <Spinner label={t.common.loading} /> : null}
      {search.status === "too_short" ? (
        <p className="text-sm text-ink-muted">{t.catalog.searchTypeMore(searchModule?.min_chars ?? 2)}</p>
      ) : null}
      {search.status === "ready" && items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t.catalog.searchNoResults}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="flex flex-col">
          {items.map((item) => (
            <SuggestionRow key={item.id} item={item} onPick={onClose} />
          ))}
        </ul>
      ) : null}

      {search.query.trim() ? (
        <Button variant="link" className="self-start px-0" onClick={submit}>
          {t.catalog.searchSeeAll(search.query.trim())}
        </Button>
      ) : null}
    </div>
  );
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" aria-label={t.catalog.searchOpen} onClick={() => setOpen(true)}>
        <Search />
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t.catalog.searchOpen} closeLabel={t.common.close}>
        {open ? <SearchBody onClose={() => setOpen(false)} /> : null}
      </Dialog>
    </>
  );
}
