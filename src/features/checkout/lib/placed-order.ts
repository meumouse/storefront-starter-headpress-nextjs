import type { PendingPayment } from "../payments/types";

/** What the order-received page needs from the checkout, kept for this tab. */
export interface PlacedOrderRecord {
  orderId: number;
  orderKey: string;
  providerId: string;
  pending: PendingPayment | null;
}

const storageKey = (orderId: number) => `hp_order_${orderId}`;

export function rememberPlacedOrder(record: PlacedOrderRecord): void {
  try {
    sessionStorage.setItem(storageKey(record.orderId), JSON.stringify(record));
  } catch {
    // Private mode: the page falls back to the plain confirmation.
  }
}

export function readPlacedOrder(orderId: number): PlacedOrderRecord | null {
  try {
    const stored = sessionStorage.getItem(storageKey(orderId));
    return stored ? (JSON.parse(stored) as PlacedOrderRecord) : null;
  } catch {
    return null;
  }
}
