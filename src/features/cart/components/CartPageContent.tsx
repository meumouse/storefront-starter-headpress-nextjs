"use client";

import { useCart } from "@meumouse.com/headpress/react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Card } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { t } from "@/i18n";
import { RecoveryCouponBanner } from "@/integrations/sellback/RecoveryCouponBanner";

import { CartLines } from "./CartLines";
import { CartPostcodeForm } from "./CartPostcodeForm";
import { CartTotals } from "./CartTotals";
import { CouponForm } from "./CouponForm";
import { FreeShippingProgress } from "./FreeShippingProgress";
import { ShippingOptions } from "./ShippingOptions";

export function CartPageContent() {
  const [{ cart, status }] = useCart();

  if (status === "loading" && !cart) return <Skeleton className="h-80" />;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title={t.cart.emptyTitle}
        description={t.cart.emptyDescription}
        action={
          <Button asChild>
            <Link href={paths.shop}>{t.cart.continueShopping}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-4">
        <RecoveryCouponBanner cart={cart} />
        {cart.freeShipping ? <FreeShippingProgress progress={cart.freeShipping} /> : null}
        <CartLines />
      </div>
      <Card className="flex flex-col gap-5 lg:sticky lg:top-24">
        <CouponForm />
        {cart.needsShipping ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">{t.cart.shippingTitle}</h2>
            <CartPostcodeForm />
            <ShippingOptions />
          </section>
        ) : null}
        <CartTotals cart={cart} />
        <Button asChild size="lg">
          <Link href={paths.checkout}>{t.cart.checkout}</Link>
        </Button>
      </Card>
    </div>
  );
}
