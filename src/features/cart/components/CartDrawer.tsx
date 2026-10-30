"use client";

import { useCart } from "@meumouse.com/headpress/react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { CartLines } from "./CartLines";
import { useCartDrawer } from "./CartDrawerProvider";
import { FreeShippingProgress } from "./FreeShippingProgress";

export function CartDrawer() {
  const { open, setOpen } = useCartDrawer();
  const [{ cart }] = useCart({ load: "never" });
  const close = () => setOpen(false);
  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen} title={t.cart.title} closeLabel={t.common.close}>
      {isEmpty ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={t.cart.emptyTitle}
          description={t.cart.emptyDescription}
          action={
            <Button asChild variant="secondary">
              <Link href={paths.shop} onClick={close}>
                {t.cart.continueShopping}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <CartLines onNavigate={close} />
          </div>
          <div className="flex flex-col gap-4 border-t border-line p-5">
            {cart.freeShipping ? <FreeShippingProgress progress={cart.freeShipping} /> : null}
            <div className="flex justify-between font-medium">
              <span>{t.cart.subtotal}</span>
              <span>{formatPrice(cart.totals.subtotal)}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="secondary">
                <Link href={paths.cart} onClick={close}>
                  {t.cart.viewCart}
                </Link>
              </Button>
              <Button asChild>
                <Link href={paths.checkout} onClick={close}>
                  {t.cart.checkout}
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
