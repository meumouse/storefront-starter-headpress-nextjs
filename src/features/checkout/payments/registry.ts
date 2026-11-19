/**
 * The gateways this storefront can take. This is the one file that names them: to add one, create
 * its provider under `src/integrations/<gateway>` and list it here. To remove one, delete the line
 * and the folder.
 */
import {
  paymentDetailsRecord,
  type Cart,
  type OrderPayment,
  type PaymentMethod,
  type PlacedOrder,
  type SplitPaymentsModuleConfig,
} from "@meumouse.com/headpress";

import { cieloCardProvider, cieloPixProvider } from "@/integrations/cielo/provider";
import { paypalButtonsProvider, paypalPixProvider } from "@/integrations/paypal/provider";

import { MethodDescription } from "../components/MethodDescription";
import { createSplitPaymentForm } from "../components/SplitPaymentForm";
import { pendingFromInstructions } from "./instructions";
import { createSplitProvider, splitOption } from "./split";
import type { PaymentProvider, PendingPayment } from "./types";

const providers: readonly PaymentProvider[] = [
  cieloCardProvider,
  cieloPixProvider,
  paypalButtonsProvider,
  paypalPixProvider,
];

/** Kinds that need a gateway form or button: without a provider, the order could never be paid. */
const NEEDS_PROVIDER = new Set(["card", "wallet"]);

/** Pix, bank slips, transfers and hosted gateways: nothing to collect, the server takes it from here. */
const offlineProvider: PaymentProvider = {
  id: "offline",
  supports: (method) => !NEEDS_PROVIDER.has(method.kind),
  Form: MethodDescription,
  pendingPayment: fromInstructions,
};

function fromInstructions(order: PlacedOrder): PendingPayment | null {
  return order.instructions ? pendingFromInstructions(order.instructions) : null;
}

/** The provider of one gateway, never the split: a part of a split is paid by a gateway. */
function gatewayProvider(method: PaymentMethod): PaymentProvider | null {
  return [...providers, offlineProvider].find((provider) => provider.supports(method)) ?? null;
}

/** Headpress's split gateway: one order paid in parts, each part by one of the gateways above. */
const splitProvider = createSplitProvider(createSplitPaymentForm(gatewayProvider));

export function providerFor(method: PaymentMethod): PaymentProvider | null {
  return splitProvider.supports(method) ? splitProvider : gatewayProvider(method);
}

export function providerById(id: string): PaymentProvider | null {
  return [splitProvider, ...providers, offlineProvider].find((provider) => provider.id === id) ?? null;
}

/** The split method, when this cart can be paid in parts (see `split.ts`). */
export function splitMethodFor(
  methods: readonly PaymentMethod[],
  cart: Pick<Cart, "paymentMethods">,
  config: SplitPaymentsModuleConfig | undefined,
): PaymentMethod | null {
  return splitOption(methods, cart, config, gatewayProvider);
}

/**
 * The methods the shopper can pick. Headpress lists every enabled gateway; the Store API's
 * `payment_methods` says which ones this cart can use, since a gateway may depend on the cart's
 * contents or total. The split gateway combines methods, so it is offered apart (`splitMethodFor`).
 * A method without a provider stays out, because the order could never be paid.
 */
export function selectableMethods(
  methods: readonly PaymentMethod[],
  cart: Pick<Cart, "paymentMethods">,
  splitGateway?: string,
): PaymentMethod[] {
  return methods.filter((method) => {
    if (method.id === splitGateway || splitProvider.supports(method)) return false;
    if (cart.paymentMethods.length > 0 && !cart.paymentMethods.includes(method.id)) return false;
    return providerFor(method) !== null;
  });
}

/**
 * What one payment of an order still needs (a part of a split order): the gateway's own reading of
 * its `payment_details` first, then the SDK's.
 */
export function pendingOfPayment(payment: OrderPayment): PendingPayment | null {
  if (payment.status !== "pending") return null;
  const method = { id: payment.gatewayId, kind: payment.kind, config: { kind: payment.kind } } as unknown as PaymentMethod;
  const details = paymentDetailsRecord(payment.raw.payment_details as Record<string, unknown> | undefined);
  const own = gatewayProvider(method)?.pendingFromDetails?.(details) ?? null;
  return own ?? (payment.instructions ? pendingFromInstructions(payment.instructions) : null);
}

/** What the order still needs from the shopper, from its provider or the SDK's reading of the answer. */
export function pendingPaymentOf(provider: PaymentProvider, order: PlacedOrder): PendingPayment | null {
  return provider.pendingPayment?.(order) ?? fromInstructions(order);
}
