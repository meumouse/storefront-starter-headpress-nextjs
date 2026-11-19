import type { Metadata } from "next";

import { Container, PageHeading } from "@/components/ui/layout";
import { CartPageContent } from "@/features/cart/components/CartPageContent";
import { CartSuggestions } from "@/features/recommendations/components/CartSuggestions";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.cart.title, robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <PageHeading title={t.cart.title} />
      <CartPageContent />
      <div className="lg:max-w-[calc(100%-26rem)]">
        <CartSuggestions />
      </div>
    </Container>
  );
}
