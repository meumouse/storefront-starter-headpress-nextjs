/**
 * Order tracking from HubGo / Envora, published by the Headpress `shipping` module
 * (`GET /headpress/v1/store/orders/{id}/tracking?key=`). The order key authorizes it, so the
 * order-received page and the account read it the same way. Dates come as the store formats them.
 */
import type { HeadpressClient } from "@meumouse.com/headpress";

export interface TrackingItem {
  trackingNumber: string;
  carrier: string;
  link: string | null;
  shippedOn: string | null;
}

export interface DeliveryPromise {
  days: number;
  dateLabel: string;
  carrier: string;
  method: string;
  overdue: boolean;
}

export interface OrderTracking {
  orderId: number;
  status: string;
  items: TrackingItem[];
  promise: DeliveryPromise | null;
}

interface RawTracking {
  order_id?: number;
  status?: string;
  items?: Record<string, string | undefined>[];
  delivery_promise?: {
    days?: number;
    date?: string;
    date_label?: string;
    carrier?: string;
    method?: string;
    overdue?: boolean;
  } | null;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Only links a shopper can open: the carrier field is free text in the admin. */
function safeLink(value: unknown): string | null {
  const link = text(value);
  return /^https?:\/\//i.test(link) ? link : null;
}

export function normalizeTracking(raw: RawTracking): OrderTracking {
  const promise = raw.delivery_promise;
  return {
    orderId: Number(raw.order_id) || 0,
    status: text(raw.status),
    items: (raw.items ?? [])
      .map((item) => ({
        trackingNumber: text(item.tracking_number),
        carrier: text(item.carrier_name) || text(item.provider_label) || text(item.provider),
        link: safeLink(item.tracking_link),
        shippedOn: text(item.ship_date_label) || text(item.date_label) || null,
      }))
      .filter((item) => item.trackingNumber),
    promise:
      promise && (promise.date_label || promise.date)
        ? {
            days: Number(promise.days) || 0,
            dateLabel: text(promise.date_label) || text(promise.date),
            carrier: text(promise.carrier),
            method: text(promise.method),
            overdue: Boolean(promise.overdue),
          }
        : null,
  };
}

export async function fetchOrderTracking(
  hp: Pick<HeadpressClient, "request">,
  orderId: number,
  orderKey: string,
): Promise<OrderTracking> {
  const raw = await hp.request<RawTracking>(`/store/orders/${orderId}/tracking`, {
    module: "shipping",
    query: { key: orderKey },
    fetchOptions: { cache: "no-store" },
  });
  return normalizeTracking(raw);
}

export type TrackingStep = "placed" | "paid" | "shipped" | "completed";

/** A partly paid order (`partial_paid`) is still waiting for its payment. */
const PAID_STATUSES = new Set(["processing", "completed"]);

/** How far the order went, from its WooCommerce status and whether a parcel left. */
export function trackingProgress(tracking: Pick<OrderTracking, "status" | "items">): TrackingStep {
  if (tracking.status === "completed") return "completed";
  if (tracking.items.length > 0) return "shipped";
  if (PAID_STATUSES.has(tracking.status)) return "paid";
  return "placed";
}
