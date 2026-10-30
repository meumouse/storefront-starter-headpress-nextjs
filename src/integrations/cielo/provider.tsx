import type { PlacedOrder } from "@meumouse.com/headpress";

import { PixNotice } from "@/features/checkout/components/PixNotice";
import type { PaymentProvider, PaymentStatus, PendingPayment } from "@/features/checkout/payments/types";

import { fetchCieloOrderPayment } from "./api";
import { CieloCardForm } from "./CieloCardForm";

const CARD_GATEWAYS = ["cielo_credit", "cielo_debit"];

/** Pix from `payment_details`: the plugin sends a URL for the image, not base64. */
export function cieloPendingPix(order: PlacedOrder): PendingPayment | null {
  const code = order.paymentDetails.cielo_pix_copy_paste;
  if (!code) return null;
  return {
    type: "pix",
    code,
    imageUrl: order.paymentDetails.cielo_pix_qr_code_url ?? null,
    expiresAt: order.paymentDetails.cielo_expires_at ?? null,
  };
}

export function cieloStatus(status: string): PaymentStatus {
  if (status === "paid" || status === "authorized") return "paid";
  if (status === "expired") return "expired";
  if (status === "failed" || status === "cancelled") return "failed";
  return "pending";
}

export const cieloCardProvider: PaymentProvider = {
  id: "cielo-card",
  supports: (method) => CARD_GATEWAYS.includes(method.id),
  Form: CieloCardForm,
};

export const cieloPixProvider: PaymentProvider = {
  id: "cielo-pix",
  supports: (method) => method.id === "cielo_pix",
  Form: PixNotice,
  pendingPayment: cieloPendingPix,
  pollStatus: async (hp, { orderId, orderKey }) =>
    cieloStatus((await fetchCieloOrderPayment(hp, orderId, orderKey)).status),
};
