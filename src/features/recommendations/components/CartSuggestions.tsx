"use client";

import { useCapability, useCart, useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { paths } from "@/config/routes";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { ProductPrice } from "@/features/catalog/components/ProductPrice";
import { t } from "@/i18n";

import { addableDirectly, contextIds, productsByIds } from "../lib/recommendations";

/** Cross-sells and products bought with what is in the cart. Nothing while the module is off. */
export function CartSuggestions({ limit = 4, onNavigate }: { limit?: number; onNavigate?(): void }) {
  const hp = useHeadpress();
  const enabled = Boolean(useCapability("recommendations"));
  const [{ cart }, { addItem }] = useCart();
  const [adding, setAdding] = useState<number | null>(null);

  const inCart = cart?.items.map((item) => item.id) ?? [];
  const suggestions = useQuery({
    queryKey: ["recommendations", "cart", [...inCart].sort(), limit],
    queryFn: async () => {
      // Ask for a few more: the cart's own products come back when they are a variation's parent.
      const ids = await contextIds(hp, "cart", { productIds: inCart, limit: Math.min(limit + inCart.length, 24) });
      return productsByIds(hp, ids.filter((id) => !inCart.includes(id)).slice(0, limit));
    },
    enabled: enabled && inCart.length > 0,
    staleTime: 5 * 60_000,
  });

  if (!suggestions.data || suggestions.data.length === 0) return null;

  const add = async (id: number) => {
    setAdding(id);
    await addItem({ id, quantity: 1 });
    setAdding(null);
  };

  return (
    <section aria-labelledby="cart-suggestions-title" className="flex flex-col gap-3">
      <h2 id="cart-suggestions-title" className="text-sm font-medium">
        {t.recommendations.cartTitle}
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {suggestions.data.map((product) => (
          <li key={product.id} className="flex items-center gap-3 py-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-control bg-sunken">
              {product.images[0] ? (
                <ProductImage src={product.images[0].src} alt="" fill sizes="3.5rem" className="object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={paths.product(product.slug)}
                onClick={onNavigate}
                className="truncate text-sm font-medium hover:underline"
              >
                {product.name}
              </Link>
              <ProductPrice product={product} />
            </div>
            {addableDirectly(product) ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label={t.recommendations.add(product.name)}
                loading={adding === product.id}
                disabled={adding !== null}
                onClick={() => void add(product.id)}
              >
                <Plus aria-hidden />
              </Button>
            ) : (
              <Button asChild variant="link" size="sm">
                <Link href={paths.product(product.slug)} onClick={onNavigate}>
                  {t.recommendations.chooseOptions}
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
