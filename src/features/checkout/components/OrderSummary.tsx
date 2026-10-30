import type { Cart } from "@meumouse.com/headpress";

import { Card, Separator } from "@/components/ui/layout";
import { CartTotals } from "@/features/cart/components/CartTotals";
import { CouponForm } from "@/features/cart/components/CouponForm";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

export function OrderSummary({ cart }: { cart: Cart }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-semibold">{t.checkout.summaryTitle}</h2>
      <ul className="flex flex-col gap-3">
        {cart.items.map((item) => {
          const image = item.images[0];
          return (
            <li key={item.key} className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-control bg-sunken">
                {image ? (
                  <ProductImage src={image.thumbnail || image.src} alt="" fill sizes="56px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-ink-muted">
                  {[...item.variation.map((entry) => entry.value), `× ${item.quantity}`].join(" · ")}
                </p>
              </div>
              <span className="text-sm">{formatPrice(item.total)}</span>
            </li>
          );
        })}
      </ul>
      <Separator />
      <CouponForm />
      <CartTotals cart={cart} />
    </Card>
  );
}
