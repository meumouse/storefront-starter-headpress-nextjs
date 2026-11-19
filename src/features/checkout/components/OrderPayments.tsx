"use client";

import type { OrderPayment } from "@meumouse.com/headpress";
import { useCapability, useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";

import { Alert, Badge, Skeleton } from "@/components/ui/feedback";
import { Card } from "@/components/ui/layout";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { pendingOfPayment } from "../payments/registry";
import { PaymentInstructions } from "./PaymentInstructions";

const POLL_INTERVAL_MS = 10_000;

function statusBadge(status: OrderPayment["status"]) {
  switch (status) {
    case "paid":
      return <Badge tone="success">{t.split.statusPaid}</Badge>;
    case "failed":
      return <Badge tone="danger">{t.split.statusFailed}</Badge>;
    case "expired":
      return <Badge tone="warning">{t.split.statusExpired}</Badge>;
    case "cancelled":
      return <Badge>{t.split.statusCancelled}</Badge>;
    case "refunded":
      return <Badge>{t.split.statusRefunded}</Badge>;
    default:
      return <Badge tone="warning">{t.split.statusPending}</Badge>;
  }
}

/**
 * The parts of an order paid in parts: each one's method, amount and state, with the Pix code of the
 * parts still to pay. Renders nothing for an order paid with one method, which shows its own.
 */
export function OrderPayments({ orderId, orderKey }: { orderId: number; orderKey: string }) {
  const hp = useHeadpress();
  const enabled = Boolean(useCapability("split_payments"));
  const summary = useQuery({
    queryKey: ["order-payments", orderId, orderKey],
    queryFn: () => hp.payments.summary(orderId, { key: orderKey || undefined }),
    enabled,
    refetchInterval: (query) => (query.state.data?.state === "partial" || query.state.data?.state === "unpaid" ? POLL_INTERVAL_MS : false),
  });

  if (!enabled || summary.isError) return null;
  if (summary.isPending) return <Skeleton className="h-32" />;
  if (!summary.data?.isSplit) return null;

  const { payments, paid, remaining } = summary.data;
  const declined = payments.some((payment) => payment.status === "failed" || payment.status === "expired");

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{t.split.paymentsTitle}</h2>
        <p className="text-sm text-ink-muted">
          {t.split.paid(formatPrice(paid))}
          {remaining.amount > 0 ? ` · ${t.split.remaining(formatPrice(remaining))}` : null}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {payments.map((payment) => {
          const pending = pendingOfPayment(payment);
          return (
            <li key={`${payment.id}-${payment.gatewayId}`} className="flex flex-col gap-3 rounded-control border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{payment.title}</span>
                <span className="flex items-center gap-2">
                  {statusBadge(payment.status)}
                  <span>{formatPrice(payment.amount)}</span>
                </span>
              </div>
              {pending ? <PaymentInstructions payment={pending} /> : null}
            </li>
          );
        })}
      </ul>
      {declined && remaining.amount > 0 ? <Alert tone="warning">{t.split.balanceNote}</Alert> : null}
    </Card>
  );
}
