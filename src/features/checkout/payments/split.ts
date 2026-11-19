/**
 * Split payments (Headpress `split_payments` module): one order paid in parts, each with a method
 * of its own, such as part Pix and part card.
 *
 * Headpress validates the plan and prices it: the discount of each method and what each part is
 * charged come from `POST /store/split-payments/quote` (through the SDK's split builder), never
 * from arithmetic here. The storefront only lets the shopper choose how to divide the total.
 */
import {
  money,
  type Cart,
  type HeadpressClient,
  type Money,
  type PaymentMethod,
  type PlacedOrder,
  type SplitPaymentsModuleConfig,
} from "@meumouse.com/headpress";
import type { SplitBuilderLeg } from "@meumouse.com/headpress/controllers";

import { pendingFromInstructions } from "./instructions";
import type { PaymentProvider, PaymentStatus, PendingPayment } from "./types";

/** Headpress marks the split gateway's config with this key (`GET /store/checkout/payment-methods`). */
export const SPLIT_EXTENSION_KEY = "split_payments";

export type ProviderLookup = (method: PaymentMethod) => PaymentProvider | null;

export function isSplitMethod(method: Pick<PaymentMethod, "config">): boolean {
  return method.config.extension_key === SPLIT_EXTENSION_KEY;
}

/**
 * The methods that can pay one part: allowed by the split module, offered for this cart, and with a
 * form the checkout drives. Gateways that draw their own button pay the whole order or nothing.
 */
export function splitLegMethods(
  methods: readonly PaymentMethod[],
  cart: Pick<Cart, "paymentMethods">,
  config: Pick<SplitPaymentsModuleConfig, "methods"> | undefined,
  lookup: ProviderLookup,
): PaymentMethod[] {
  const allowed = new Set((config?.methods ?? []).map((entry) => entry.id).filter(Boolean));
  return methods.filter((method) => {
    if (isSplitMethod(method) || !allowed.has(method.id)) return false;
    if (cart.paymentMethods.length > 0 && !cart.paymentMethods.includes(method.id)) return false;
    const provider = lookup(method);
    return provider !== null && !provider.submitsItself;
  });
}

/** The split method, when the store offers it for this cart and there are two methods to combine. */
export function splitOption(
  methods: readonly PaymentMethod[],
  cart: Pick<Cart, "paymentMethods">,
  config: SplitPaymentsModuleConfig | undefined,
  lookup: ProviderLookup,
): PaymentMethod | null {
  if (!config || config.checkout_enabled === false) return null;
  const method = methods.find((entry) => isSplitMethod(entry) || entry.id === config.gateway_id);
  if (!method) return null;
  if (cart.paymentMethods.length > 0 && !cart.paymentMethods.includes(method.id)) return null;
  return splitLegMethods(methods, cart, config, lookup).length >= 2 ? method : null;
}

/** Each part's amount, with the last one taking whatever the others leave. */
export function withRemainder(total: Money, legs: readonly SplitBuilderLeg[]): SplitBuilderLeg[] {
  const others = legs.slice(0, -1).reduce((sum, leg) => sum + leg.amount.amount, 0);
  return legs.map((leg, index) =>
    index === legs.length - 1
      ? { ...leg, amount: money(Math.max(total.amount - others, 0), total.currency, total.minorUnit) }
      : leg,
  );
}

/** A first plan for the shopper to adjust: Pix and a card when the store has both, half each. */
export function defaultLegs(total: Money, legMethods: readonly PaymentMethod[]): SplitBuilderLeg[] {
  const first = legMethods.find((method) => method.kind === "pix") ?? legMethods[0];
  if (!first) return [];
  const second =
    legMethods.find((method) => method.kind === "card" && method.id !== first.id) ??
    legMethods.find((method) => method.id !== first.id) ??
    first;
  const half = money(Math.floor(total.amount / 2), total.currency, total.minorUnit);
  return withRemainder(total, [
    { gatewayId: first.id, amount: half },
    { gatewayId: second.id, amount: half },
  ]);
}

/**
 * What the shopper typed in an amount field, in minor units, or null when it is not an amount.
 * Takes `1.234,56`, `1,234.56`, `1234.5` and `1234`: the last separator followed by at most
 * `minorUnit` digits is the decimal one.
 */
export function parseAmountInput(text: string, minorUnit: number): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!/\d/.test(cleaned)) return null;
  const last = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const decimals = last >= 0 ? cleaned.slice(last + 1) : "";
  const hasDecimals = last >= 0 && decimals.length > 0 && decimals.length <= minorUnit && minorUnit > 0;
  const whole = (hasDecimals ? cleaned.slice(0, last) : cleaned).replace(/[.,]/g, "");
  const fraction = hasDecimals ? decimals.padEnd(minorUnit, "0") : "0".repeat(minorUnit);
  const value = Number(`${whole || "0"}${fraction}`);
  return Number.isSafeInteger(value) ? value : null;
}

/** Shapes of `GET /store/orders/{id}/payments` this storefront reads. */
interface RawPaymentState {
  state?: string;
}

export function splitPaymentStatus(state: string | undefined): PaymentStatus {
  if (state === "paid" || state === "overpaid") return "paid";
  if (state === "refunded") return "failed";
  return "pending";
}

/** The first part still to pay with a code (the Pix of a "Pix + card" order). */
export function splitPendingPayment(order: Pick<PlacedOrder, "splitLegs">): PendingPayment | null {
  const leg = order.splitLegs.find((entry) => entry.instructions !== null);
  return leg?.instructions ? pendingFromInstructions(leg.instructions) : null;
}

/** The split method's provider. The registry passes the form, built with its own provider lookup. */
export function createSplitProvider(Form: PaymentProvider["Form"]): PaymentProvider {
  return {
    id: "split",
    supports: isSplitMethod,
    Form,
    pendingPayment: splitPendingPayment,
    pollStatus: async (hp: Pick<HeadpressClient, "request">, { orderId, orderKey }) => {
      const summary = await hp.request<RawPaymentState>(`/store/orders/${orderId}/payments`, {
        module: "split_payments",
        query: { key: orderKey },
        fetchOptions: { cache: "no-store" },
      });
      return splitPaymentStatus(summary.state);
    },
  };
}
