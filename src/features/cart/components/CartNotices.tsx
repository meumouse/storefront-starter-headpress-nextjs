import type { Cart } from "@meumouse.com/headpress";

import { Alert } from "@/components/ui/feedback";

/** Problems the Store API reports on the cart itself: a coupon that stopped applying, stock that ran out. */
export function CartNotices({ cart }: { cart: Pick<Cart, "errors"> }) {
  if (cart.errors.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {cart.errors.map((error) => (
        <Alert key={`${error.code}-${error.message}`} tone="warning">
          {error.message}
        </Alert>
      ))}
    </div>
  );
}
