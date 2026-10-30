"use client";

import { useCart } from "@meumouse.com/headpress/react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

import { useCartDrawer } from "./CartDrawerProvider";

export function CartButton() {
  const [{ cart }] = useCart();
  const { setOpen } = useCartDrawer();
  const count = cart?.itemsCount ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={t.cart.openCart(count)}
      onClick={() => setOpen(true)}
    >
      <ShoppingBag />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-medium text-on-brand"
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}
