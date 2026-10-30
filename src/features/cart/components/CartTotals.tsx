import type { Cart, Money } from "@meumouse.com/headpress";

import { Separator } from "@/components/ui/layout";
import { t } from "@/i18n";
import { cartUpfrontTotal } from "@/integrations/installments/pricing";
import { formatPrice } from "@/lib/money";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function hasValue(value: Money): boolean {
  return value.amount !== 0;
}

/** The server's totals. The storefront adds nothing up. */
export function CartTotals({ cart }: { cart: Cart }) {
  const { totals } = cart;
  const upfront = cartUpfrontTotal(cart);
  const shipping =
    totals.shipping === null
      ? t.cart.shippingPending
      : totals.shipping.amount === 0
        ? t.cart.shippingFree
        : formatPrice(totals.shipping);

  return (
    <dl className="flex flex-col gap-2">
      <Row label={t.cart.subtotal} value={formatPrice(totals.subtotal)} />
      {hasValue(totals.discount) ? <Row label={t.cart.discount} value={`- ${formatPrice(totals.discount)}`} /> : null}
      {cart.needsShipping ? <Row label={t.cart.shipping} value={shipping} /> : null}
      {hasValue(totals.fees) ? <Row label={t.cart.fees} value={formatPrice(totals.fees)} /> : null}
      {hasValue(totals.tax) ? <Row label={t.cart.tax} value={formatPrice(totals.tax)} /> : null}
      <Separator className="my-1" />
      <div className="flex items-baseline justify-between gap-4">
        <dt className="font-medium">{t.cart.total}</dt>
        <dd className="text-xl font-semibold">{formatPrice(totals.total)}</dd>
      </div>
      {upfront ? (
        <p className="text-right text-sm text-success">
          {t.cart.upfrontTotal(formatPrice(upfront.total), upfront.label ?? t.catalog.upfrontDefault)}
        </p>
      ) : null}
    </dl>
  );
}
