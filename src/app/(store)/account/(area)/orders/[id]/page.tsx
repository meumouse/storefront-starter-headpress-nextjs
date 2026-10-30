import { notFound } from "next/navigation";

import { OrderDetails } from "@/features/account/components/Orders";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <OrderDetails orderId={id} />;
}
