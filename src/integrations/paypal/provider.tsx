import type { PlacedOrder } from "@meumouse.com/headpress";

import { createPixForm } from "@/features/checkout/components/PixNotice";
import type { PaymentProvider, PaymentStatus, PendingPayment } from "@/features/checkout/payments/types";

import { fetchPayPalPixStatus } from "./api";
import { isPayPalGateway, toPayPalConfig } from "./config";
import { PayPalButtons } from "./PayPalButtons";

/** `pix_expires_at` is a Unix timestamp; `pix_image` may be empty (the QR is drawn from the code). */
export function paypalPendingPix(order: PlacedOrder): PendingPayment | null {
  const code = order.paymentDetails.pix_code;
  if (!code) return null;
  const expires = Number(order.paymentDetails.pix_expires_at);
  return {
    type: "pix",
    code,
    imageUrl: order.paymentDetails.pix_image || null,
    expiresAt: Number.isFinite(expires) && expires > 0 ? new Date(expires * 1000).toISOString() : null,
  };
}

function toStatus(status: string): PaymentStatus {
  if (status === "paid") return "paid";
  if (status === "expired") return "expired";
  return "pending";
}

export const paypalButtonsProvider: PaymentProvider = {
  id: "paypal-buttons",
  supports: (method) => {
    const flow = toPayPalConfig(method.config)?.flow;
    return isPayPalGateway(method.id) && (flow === "wallet" || flow === "card");
  },
  Form: PayPalButtons,
  submitsItself: true,
};

export const paypalPixProvider: PaymentProvider = {
  id: "paypal-pix",
  supports: (method) => isPayPalGateway(method.id) && toPayPalConfig(method.config)?.flow === "pix",
  Form: createPixForm(() => "document"),
  pendingPayment: paypalPendingPix,
  pollStatus: async (hp, { orderId, orderKey }) => toStatus(await fetchPayPalPixStatus(hp, orderId, orderKey)),
};
