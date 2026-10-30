"use client";

import type { Product } from "@meumouse.com/headpress";
import { productEventParams } from "@meumouse.com/headpress/analytics";
import { useCart, useFormatError } from "@meumouse.com/headpress/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { WishlistButton } from "@/features/account/components/Wishlist";
import { getAnalytics } from "@/features/analytics/analytics";
import { useCartDrawer } from "@/features/cart/components/CartDrawerProvider";
import { t } from "@/i18n";
import { InstallmentsTable } from "@/integrations/installments/InstallmentsTable";
import { ProductShippingCalculator } from "@/integrations/shipping/ProductShippingCalculator";
import { cn } from "@/lib/utils";

import {
  addItemVariation,
  defaultSelection,
  findVariationId,
  isTermAvailable,
  selectableAttributes,
  type VariationSelection,
} from "../lib/variations";
import { ProductPrice } from "./ProductPrice";

/** A product as it crosses to the browser: the raw Store API payload stays on the server. */
export type ClientProduct = Omit<Product, "raw">;

interface ProductPurchaseProps {
  product: ClientProduct;
  variations: ClientProduct[];
  /** Where an external product is sold, with the words WooCommerce uses for the button. */
  external?: { url: string; text: string } | null;
}

export function ProductPurchase({ product, variations, external = null }: ProductPurchaseProps) {
  const [{ pending, error }, { addItem, clearError }] = useCart();
  const formatError = useFormatError();
  const { setOpen: openCart } = useCartDrawer();

  const [selection, setSelection] = useState<VariationSelection>(() => defaultSelection(product));
  const [quantity, setQuantity] = useState(product.quantity.min);

  const attributes = selectableAttributes(product);
  const isVariable = attributes.length > 0;
  const variationId = isVariable ? findVariationId(product, selection) : null;
  const variation = variations.find((entry) => entry.id === variationId) ?? null;
  const soldOut = useMemo(
    () => new Set(variations.filter((entry) => !entry.stock.inStock).map((entry) => entry.id)),
    [variations],
  );

  // The chosen variation decides the price, the stock and the quantity limits.
  const current = variation ?? product;
  const needsSelection = isVariable && !variationId;
  const canBuy = !needsSelection && current.stock.purchasable && current.stock.inStock;

  const select = (name: string, slug: string) => {
    clearError();
    setSelection((previous) => ({ ...previous, [name]: slug }));
  };

  const add = async () => {
    const cart = await addItem({
      id: variationId ?? product.id,
      quantity,
      variation: isVariable ? addItemVariation(product, selection) : undefined,
    });
    if (!cart) return;
    openCart(true);
    getAnalytics()?.tracker.track("add_to_cart", productEventParams(current as Product, { quantity }));
  };

  // Once per product, whichever variation is chosen after.
  const productId = product.id;
  const viewed = useRef<number | null>(null);
  useEffect(() => {
    if (viewed.current === productId) return;
    viewed.current = productId;
    getAnalytics()?.tracker.track("view_item", productEventParams(product as Product));
  }, [productId, product]);

  const buttonLabel = needsSelection
    ? t.catalog.selectOptions
    : current.stock.inStock
      ? t.catalog.addToCart
      : t.catalog.outOfStock;

  return (
    <div className="flex flex-col gap-6">
      <ProductPrice product={current} size="lg" />

      {attributes.map((attribute) => {
        const chosen = selection[attribute.name];
        return (
          // Keys by name: WooCommerce sends id 0 for attributes defined on the product itself.
          <fieldset key={attribute.name} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {attribute.name}
              {chosen ? (
                <span className="ml-2 font-normal text-ink-muted">
                  {attribute.terms.find((term) => term.slug === chosen)?.name}
                </span>
              ) : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {attribute.terms.map((term) => {
                const available = isTermAvailable(product, selection, attribute.name, term.slug, soldOut);
                return (
                  <button
                    key={term.slug}
                    type="button"
                    aria-pressed={chosen === term.slug}
                    disabled={!available}
                    onClick={() => select(attribute.name, term.slug)}
                    className={cn(
                      "min-w-12 rounded-control border px-3 py-2 text-sm transition-colors",
                      chosen === term.slug
                        ? "border-ink bg-ink text-ink-inverse"
                        : "border-line-strong hover:bg-sunken",
                      !available && "cursor-not-allowed line-through opacity-40 hover:bg-transparent",
                    )}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {current.stock.lowStockRemaining ? (
        <Badge tone="warning" className="self-start">
          {t.catalog.lowStock(current.stock.lowStockRemaining)}
        </Badge>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {!current.quantity.soldIndividually && !external ? (
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            min={current.quantity.min}
            max={current.quantity.max}
            step={current.quantity.step}
            label={t.catalog.quantity}
            decreaseLabel={t.catalog.decreaseQuantity}
            increaseLabel={t.catalog.increaseQuantity}
            className="h-13"
          />
        ) : null}
        {external ? (
          <Button asChild size="lg" className="flex-1">
            <a href={external.url} target="_blank" rel="noreferrer">
              {external.text}
            </a>
          </Button>
        ) : (
          <Button size="lg" className="flex-1" disabled={!canBuy} loading={pending.includes("new")} onClick={add}>
            {buttonLabel}
          </Button>
        )}
        <WishlistButton productId={product.id} />
      </div>

      {error ? <Alert tone="danger">{formatError(error, "cart")}</Alert> : null}

      <InstallmentsTable product={current} />
      <ProductShippingCalculator productId={product.id} variationId={variationId ?? undefined} quantity={quantity} />
    </div>
  );
}
