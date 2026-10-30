"use client";

import type { OrderSummary } from "@meumouse.com/headpress";
import { useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Card, Separator } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { storeLocale, t } from "@/i18n";
import { formatPrice } from "@/lib/money";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(storeLocale, { dateStyle: "medium" }) : "";
}

function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <li>
      <Link
        href={paths.order(order.id)}
        className="flex flex-wrap items-center justify-between gap-3 rounded-control p-3 transition-colors hover:bg-sunken"
      >
        <span className="flex flex-col">
          <span className="font-medium">{t.account.orderNumber(order.number)}</span>
          <span className="text-sm text-ink-muted">
            {formatDate(order.date_created)} · {t.account.orderItems(order.item_count)}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <Badge tone={order.needs_payment ? "warning" : "success"}>{order.status_label}</Badge>
          <span className="font-medium">{formatPrice(order.total)}</span>
        </span>
      </Link>
    </li>
  );
}

export function OrdersList({ limit }: { limit?: number }) {
  const hp = useHeadpress();
  const orders = useQuery({
    queryKey: ["orders", limit],
    queryFn: () => hp.customer.orders.list({ perPage: limit ?? 20 }),
  });

  if (orders.isPending) return <Skeleton className="h-40" />;
  if (orders.isError) return <Alert tone="danger">{hp.formatError(orders.error)}</Alert>;
  if (orders.data.items.length === 0) {
    return <EmptyState icon={<Package />} title={t.account.ordersEmpty} className="py-10" />;
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {orders.data.items.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

export function OrderDetails({ orderId }: { orderId: number }) {
  const hp = useHeadpress();
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => hp.customer.orders.get(orderId),
    retry: false,
  });

  if (order.isPending) return <Skeleton className="h-80" />;
  if (order.isError) return <Alert tone="danger">{t.account.orderNotFound}</Alert>;

  const { data } = order;
  const rows = [
    { label: t.cart.subtotal, value: data.totals.subtotal },
    ...(data.totals.discount.amount ? [{ label: t.cart.discount, value: data.totals.discount }] : []),
    { label: t.cart.shipping, value: data.totals.shipping },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href={paths.orders} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t.account.orderBack}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t.account.orderNumber(data.number)}</h1>
        <Badge tone={data.needs_payment ? "warning" : "success"}>{data.status_label}</Badge>
      </div>
      <Card className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {data.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.total)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <dl className="flex flex-col gap-1 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd>{formatPrice(row.value)}</dd>
            </div>
          ))}
          <div className="flex justify-between font-medium">
            <dt>{t.cart.total}</dt>
            <dd>{formatPrice(data.totals.total)}</dd>
          </div>
        </dl>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="text-sm">
          <h2 className="mb-2 font-medium">{t.account.orderShipping}</h2>
          <p className="text-ink-muted">
            {data.shipping.first_name} {data.shipping.last_name}
            <br />
            {data.shipping.address_1}
            <br />
            {data.shipping.city} {data.shipping.state} {data.shipping.postcode}
          </p>
        </Card>
        <Card className="text-sm">
          <h2 className="mb-2 font-medium">{t.account.orderPayment}</h2>
          <p className="text-ink-muted">{data.payment_method_title}</p>
        </Card>
      </div>
    </div>
  );
}
