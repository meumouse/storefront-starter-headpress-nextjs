/**
 * The public routes of the Cielo plugin (`wc-cielo/v1/store/*`). They run in the browser on purpose:
 * the plugin limits the token routes per IP and sends that IP to the 3DS, so they must carry the
 * buyer's own IP, never a server's.
 */
import { isHeadpressError, type HeadpressClient } from "@meumouse.com/headpress";

import { PaymentError } from "@/features/checkout/payments/types";
import { t } from "@/i18n";

import type { CieloInstallmentPlan, CieloThreeDsToken } from "./card";

type Client = Pick<HeadpressClient, "request">;

const API = "wc-cielo/v1";

export interface CieloSopToken {
  access_token: string;
  expires_at: string | null;
  environment: "sandbox" | "production";
  script_url: string;
}

/** The order's payment object (`docs/api/headless.md`, section 5, of the plugin). */
export interface CieloOrderPayment {
  status: string;
  is_paid: boolean;
  pix: { copy_paste?: string; qr_code?: string; qr_code_url?: string } | null;
  actions: { renew: boolean };
  message: string | null;
  poll_interval: number;
}

function toPaymentError(error: unknown, fallback: string): PaymentError {
  if (isHeadpressError(error) && error.status === 429) return new PaymentError(t.checkout.cieloTooManyAttempts);
  return new PaymentError(error instanceof Error && isHeadpressError(error) ? error.message || fallback : fallback);
}

/** Access token of the Silent Order Post: one per card, asked right before tokenizing. */
export async function fetchCieloSopToken(hp: Client): Promise<CieloSopToken> {
  try {
    return await hp.request<CieloSopToken>("/store/sop/access-token", { api: API, method: "POST" });
  } catch (error) {
    throw toPaymentError(error, t.checkout.cieloStartFailed);
  }
}

/** Token of the 3DS script: one per authentication, with the buyer's IP in `device_ip`. */
export async function fetchCieloThreeDsToken(hp: Client): Promise<CieloThreeDsToken> {
  try {
    return await hp.request<CieloThreeDsToken>("/store/3ds/access-token", { api: API, method: "POST" });
  } catch (error) {
    throw toPaymentError(error, t.checkout.cieloAuthStartFailed);
  }
}

/** Credit installments of an amount (minor units) for a brand. A preview: the checkout recalculates them. */
export function fetchCieloInstallments(
  hp: Client,
  amount: number,
  brand: string | null,
): Promise<CieloInstallmentPlan> {
  return hp.request<CieloInstallmentPlan>("/store/installments", {
    api: API,
    query: { amount: Math.round(amount), brand: brand ?? undefined },
  });
}

/** The order's payment. Also makes the plugin ask Cielo, so polling works without notifications. */
export function fetchCieloOrderPayment(hp: Client, orderId: number, key: string): Promise<CieloOrderPayment> {
  return hp.request<CieloOrderPayment>(`/store/orders/${orderId}/payment`, { api: API, query: { key } });
}
