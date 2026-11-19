"use client";

import { productEventParams } from "@meumouse.com/headpress/analytics";
import type { Product } from "@meumouse.com/headpress";
import { useCart, useFormatError } from "@meumouse.com/headpress/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { getAnalytics } from "@/features/analytics/analytics";
import { useCartDrawer } from "@/features/cart/components/CartDrawerProvider";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { ProductPrice } from "@/features/catalog/components/ProductPrice";
import type { ClientProduct } from "@/features/catalog/components/ProductPurchase";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

import { addableDirectly } from "../lib/recommendations";

/**
 * The product with what is most often bought with it, each with a checkbox, and one button that adds
 * the chosen ones. Products that need options (variations) link to their page instead.
 */
export function BoughtTogether({ product, suggestions }: { product: ClientProduct; suggestions: ClientProduct[] }) {
  const [{ error }, { addItem, clearError }] = useCart();
  const formatError = useFormatError();
  const { setOpen: openCart } = useCartDrawer();
  const entries = [product, ...suggestions];
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(entries.filter(addableDirectly).map((entry) => entry.id)),
  );
  const [adding, setAdding] = useState(false);

  const toggle = (id: number) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async () => {
    setAdding(true);
    clearError();
    let added = true;
    // One at a time: every add-item answers the whole cart, and the next builds on it.
    for (const entry of entries.filter((item) => selected.has(item.id))) {
      const quantity = entry.quantity.min || 1;
      const cart = await addItem({ id: entry.id, quantity });
      if (!cart) {
        added = false;
        break;
      }
      getAnalytics()?.tracker.track("add_to_cart", productEventParams(entry as Product, { quantity }));
    }
    setAdding(false);
    if (added) openCart(true);
  };

  return (
    <section aria-labelledby="bought-together-title" className="flex flex-col gap-4">
      <div>
        <h2 id="bought-together-title" className="text-xl font-semibold">
          {t.recommendations.boughtTogetherTitle}
        </h2>
        <p className="text-sm text-ink-muted">{t.recommendations.boughtTogetherDescription}</p>
      </div>

      <ol className="flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-stretch">
        {entries.map((entry, index) => {
          const addable = addableDirectly(entry);
          const image = entry.images[0];
          const checked = selected.has(entry.id);
          return (
            <li key={entry.id} className="flex items-center gap-3 sm:flex-1">
              {index > 0 ? <Plus className="hidden size-5 shrink-0 text-ink-subtle sm:block" aria-hidden /> : null}
              <div
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors sm:flex-col sm:items-start",
                  checked && "border-brand",
                )}
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-control bg-sunken sm:size-28">
                  {image ? (
                    <ProductImage src={image.src} alt="" fill sizes="10rem" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {index === 0 ? <span className="text-xs text-ink-muted">{t.recommendations.thisItem}</span> : null}
                  {index === 0 ? (
                    <span className="text-sm font-medium">{entry.name}</span>
                  ) : (
                    <Link href={paths.product(entry.slug)} className="text-sm font-medium hover:underline">
                      {entry.name}
                    </Link>
                  )}
                  <ProductPrice product={entry} />
                  {addable ? (
                    <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--ds-brand)]"
                        checked={checked}
                        onChange={() => toggle(entry.id)}
                      />
                      <span className="sr-only">{t.recommendations.include(entry.name)}</span>
                    </label>
                  ) : index > 0 ? (
                    <Link href={paths.product(entry.slug)} className="mt-1 text-sm text-brand hover:underline">
                      {t.recommendations.chooseOptions}
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? <Alert tone="danger">{formatError(error, "cart")}</Alert> : null}
      <Button className="self-start" disabled={selected.size === 0} loading={adding} onClick={add}>
        {t.recommendations.addSelected(selected.size)}
      </Button>
    </section>
  );
}
