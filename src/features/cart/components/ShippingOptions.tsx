"use client";

import { useCart } from "@meumouse.com/headpress/react";

import { ChoiceLabel } from "@/components/ui/field";
import { t } from "@/i18n";
import { rateDelivery } from "@/integrations/shipping/delivery";
import { formatPrice } from "@/lib/money";

/** The rates of the cart's packages, for the address the Store API has. */
export function ShippingOptions() {
  const [{ cart, status }, { selectShippingRate }] = useCart({ load: "never" });

  if (!cart || !cart.needsShipping || !cart.hasCalculatedShipping) return null;

  const packages = cart.shippingPackages.filter((shippingPackage) => shippingPackage.rates.length > 0);
  if (packages.length === 0) return <p className="text-sm text-ink-muted">{t.cart.noRates}</p>;

  return (
    <div className="flex flex-col gap-4">
      {packages.map((shippingPackage) => (
        <fieldset key={shippingPackage.id} className="flex flex-col gap-2">
          <legend className="sr-only">{shippingPackage.name || t.cart.shippingTitle}</legend>
          {shippingPackage.rates.map((rate) => {
            const delivery = rateDelivery(cart, rate);
            return (
              <ChoiceLabel
                key={rate.id}
                type="radio"
                name={`shipping-${shippingPackage.id}`}
                checked={rate.selected}
                disabled={status === "loading"}
                className="rounded-control border border-line p-3 has-checked:border-brand"
                onChange={() => void selectShippingRate(shippingPackage.id, rate.id)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    {rate.name}
                    {delivery ? <span className="block text-xs text-ink-muted">{delivery}</span> : null}
                  </span>
                  <span className="font-medium">
                    {rate.price.amount === 0 ? t.cart.shippingFree : formatPrice(rate.price)}
                  </span>
                </span>
              </ChoiceLabel>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
