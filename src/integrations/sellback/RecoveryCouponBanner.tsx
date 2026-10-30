import type { Cart } from "@meumouse.com/headpress";

import { Alert } from "@/components/ui/feedback";
import { t } from "@/i18n";

import { sellbackCartData } from "./api";

export function RecoveryCouponBanner({ cart }: { cart: Pick<Cart, "extensions"> }) {
  const { coupon } = sellbackCartData(cart);
  return coupon ? <Alert tone="success">{t.recovery.couponBanner(coupon)}</Alert> : null;
}
