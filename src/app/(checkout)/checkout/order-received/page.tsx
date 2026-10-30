import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/layout";
import { OrderReceived } from "@/features/checkout/components/OrderReceived";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.checkout.receivedTitle, robots: { index: false } };

export default async function OrderReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; key?: string }>;
}) {
  const { order_id: orderId, key } = await searchParams;
  const id = Number(orderId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return (
    <Container className="py-10">
      <OrderReceived orderId={id} orderKey={key ?? ""} />
    </Container>
  );
}
