import type { Cart } from "@meumouse.com/headpress";

import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

/** The server's progress towards free shipping. */
export function FreeShippingProgress({ progress }: { progress: NonNullable<Cart["freeShipping"]> }) {
  const reached = progress.qualifies || progress.hasFreeRate;
  const percent = reached ? 100 : Math.min((progress.subtotal.amount / progress.threshold.amount) * 100, 100);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm">
        {reached ? t.cart.freeShippingUnlocked : t.cart.freeShippingRemaining(formatPrice(progress.remaining))}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
