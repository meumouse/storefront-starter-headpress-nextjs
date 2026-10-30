"use client";

import { trackPurchase } from "@meumouse.com/headpress/analytics";
import { useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Card } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { getAnalytics } from "@/features/analytics/analytics";
import { t } from "@/i18n";

import { readPlacedOrder, type PlacedOrderRecord } from "../lib/placed-order";
import { providerById } from "../payments/registry";
import type { PaymentStatus } from "../payments/types";
import { PaymentInstructions } from "./PaymentInstructions";

const POLL_INTERVAL_MS = 5_000;

const subscribeNever = () => () => undefined;

/** The checkout's record lives in `sessionStorage`, so the server renders without it. */
function usePlacedOrder(orderId: number): PlacedOrderRecord | null {
  const snapshot = useSyncExternalStore(
    subscribeNever,
    () => sessionStorage.getItem(`hp_order_${orderId}`),
    () => null,
  );
  return snapshot ? readPlacedOrder(orderId) : null;
}

function StatusMessage({ status }: { status: PaymentStatus }) {
  if (status === "paid") return <Alert tone="success">{t.checkout.receivedPaid}</Alert>;
  if (status === "expired") return <Alert tone="warning">{t.checkout.receivedExpired}</Alert>;
  if (status === "failed") return <Alert tone="danger">{t.checkout.receivedFailed}</Alert>;
  return <Alert tone="info">{t.checkout.receivedPending}</Alert>;
}

export function OrderReceived({ orderId, orderKey }: { orderId: number; orderKey: string }) {
  const hp = useHeadpress();
  const record = usePlacedOrder(orderId);
  const provider = record ? providerById(record.providerId) : null;
  const pollStatus = provider?.pollStatus;

  const status = useQuery({
    queryKey: ["order-payment", orderId, record?.providerId],
    queryFn: () => (pollStatus as NonNullable<typeof pollStatus>)(hp, { orderId, orderKey }),
    enabled: Boolean(pollStatus) && Boolean(orderKey),
    refetchInterval: (query) => (query.state.data === undefined || query.state.data === "pending" ? POLL_INTERVAL_MS : false),
  });

  const current = status.data ?? null;
  const showInstructions = record?.pending && current !== "paid" && current !== "expired";

  // `trackPurchase` keeps it to once per order per browser; the server reports the sale regardless.
  const paid = current === "paid" || (record !== null && !pollStatus && !record.pending);
  useEffect(() => {
    const analytics = getAnalytics();
    if (paid && analytics) void trackPurchase(hp, analytics.tracker, { orderId, key: orderKey });
  }, [paid, hp, orderId, orderKey]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Card className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <h1 className="text-2xl font-semibold">{t.checkout.receivedTitle}</h1>
        <p className="font-medium">{t.checkout.receivedNumber(orderId)}</p>
        <p className="text-sm text-ink-muted">{t.checkout.receivedDescription}</p>
      </Card>

      {current ? <StatusMessage status={current} /> : null}
      {showInstructions && record?.pending ? (
        <Card>
          <PaymentInstructions payment={record.pending} />
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="secondary">
          <Link href={paths.orders}>{t.checkout.viewOrders}</Link>
        </Button>
        <Button asChild>
          <Link href={paths.shop}>{t.checkout.keepShopping}</Link>
        </Button>
      </div>
    </div>
  );
}
