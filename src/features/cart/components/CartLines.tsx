"use client";

import type { CartItem } from "@meumouse.com/headpress";
import { useCart } from "@meumouse.com/headpress/react";
import { Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

function CartLine({ item, pending, onNavigate }: { item: CartItem; pending: boolean; onNavigate?: () => void }) {
  const [, { updateItem, removeItem }] = useCart({ load: "never" });
  const image = item.images[0];
  const details = [...item.variation.map((entry) => `${entry.attribute}: ${entry.value}`), ...item.itemData.map((entry) => `${entry.name}: ${entry.value}`)];

  return (
    <li className="flex gap-3 py-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-control bg-sunken">
        {image ? <ProductImage src={image.thumbnail || image.src} alt="" fill sizes="80px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.path ? (
              <Link href={item.path} onClick={onNavigate} className="text-sm font-medium hover:underline">
                {item.name}
              </Link>
            ) : (
              <span className="text-sm font-medium">{item.name}</span>
            )}
            {details.map((detail) => (
              <p key={detail} className="text-xs text-ink-muted">
                {detail}
              </p>
            ))}
          </div>
          <span className="text-sm font-medium">{formatPrice(item.total)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          {item.quantityLimits.editable ? (
            <QuantityStepper
              value={item.quantity}
              onChange={(quantity) => void updateItem(item.key, quantity)}
              min={item.quantityLimits.min}
              max={item.quantityLimits.max}
              step={item.quantityLimits.step}
              disabled={pending}
              label={t.cart.quantityOf(item.name)}
              decreaseLabel={t.catalog.decreaseQuantity}
              increaseLabel={t.catalog.increaseQuantity}
            />
          ) : (
            <span className="text-sm text-ink-muted">{item.quantity}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={t.cart.removeItem(item.name)}
            onClick={() => void removeItem(item.key)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function CartLines({ onNavigate }: { onNavigate?: () => void }) {
  const [{ cart, pending }] = useCart({ load: "never" });

  return (
    <ul className="flex flex-col divide-y divide-line">
      {cart?.items.map((item) => (
        <CartLine key={item.key} item={item} pending={pending.includes(item.key)} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}
