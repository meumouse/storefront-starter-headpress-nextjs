import type { Metadata } from "next";

import { Container, PageHeading } from "@/components/ui/layout";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.checkout.title, robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <PageHeading title={t.checkout.title} />
      <CheckoutForm />
    </Container>
  );
}
