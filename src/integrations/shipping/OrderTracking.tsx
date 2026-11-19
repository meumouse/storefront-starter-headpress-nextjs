"use client";

import { isHeadpressError } from "@meumouse.com/headpress";
import { useCapability, useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Truck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Card } from "@/components/ui/layout";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

import { fetchOrderTracking, trackingProgress, type TrackingItem, type TrackingStep } from "./tracking";

const STEPS: { id: TrackingStep; label: string }[] = [
  { id: "placed", label: t.tracking.stepPlaced },
  { id: "paid", label: t.tracking.stepPaid },
  { id: "shipped", label: t.tracking.stepShipped },
  { id: "completed", label: t.tracking.stepCompleted },
];

function Progress({ step }: { step: TrackingStep }) {
  const reached = STEPS.findIndex((entry) => entry.id === step);
  return (
    <ol aria-label={t.tracking.progressLabel} className="grid grid-cols-4 gap-2">
      {STEPS.map((entry, index) => {
        const done = index <= reached;
        return (
          <li
            key={entry.id}
            aria-label={done ? t.tracking.stepDone(entry.label) : undefined}
            aria-current={index === reached ? "step" : undefined}
            className="flex flex-col gap-2"
          >
            <span className={cn("h-1.5 rounded-full bg-line", done && "bg-brand")} />
            <span className={cn("text-xs text-ink-subtle", done && "font-medium text-ink")}>{entry.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Parcel({ item }: { item: TrackingItem }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(item.trackingNumber);
    setCopied(true);
  };

  return (
    <li className="flex flex-col gap-2 rounded-control border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-ink-muted">{item.carrier || t.tracking.code}</span>
          <code className="font-mono text-sm font-medium">{item.trackingNumber}</code>
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? t.tracking.copied : t.tracking.copy}
        </Button>
      </div>
      {item.shippedOn ? <p className="text-xs text-ink-muted">{t.tracking.shippedOn(item.shippedOn)}</p> : null}
      {item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-sm text-brand hover:underline"
        >
          {t.tracking.trackOnCarrier(item.carrier || t.tracking.carrierFallback)}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : null}
    </li>
  );
}

/**
 * Where the order is: its progress, the delivery estimate and each parcel's tracking code. Renders
 * nothing while the shipping module is off or the order is not found.
 */
export function OrderTracking({ orderId, orderKey }: { orderId: number; orderKey: string }) {
  const hp = useHeadpress();
  const enabled = Boolean(useCapability("shipping")) && Boolean(orderKey);
  const tracking = useQuery({
    queryKey: ["order-tracking", orderId, orderKey],
    queryFn: () => fetchOrderTracking(hp, orderId, orderKey),
    enabled,
    retry: (count, error) => !isHeadpressError(error, "headpress_not_found") && count < 2,
    staleTime: 60_000,
  });

  if (!enabled || tracking.isError) return null;
  if (tracking.isPending) return <Skeleton className="h-32" />;

  const { items, promise } = tracking.data;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-medium">
        <Truck className="size-4" aria-hidden />
        {t.tracking.title}
      </h2>
      <Progress step={trackingProgress(tracking.data)} />
      {promise ? (
        <p className="text-sm">
          <span className="font-medium">{t.tracking.estimate(promise.dateLabel)}</span>
          {promise.carrier ? <span className="text-ink-muted"> {t.tracking.estimateBy(promise.carrier)}</span> : null}
        </p>
      ) : null}
      {promise?.overdue ? <Alert tone="warning">{t.tracking.overdue}</Alert> : null}
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <Parcel key={item.trackingNumber} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{t.tracking.noCode}</p>
      )}
    </Card>
  );
}
