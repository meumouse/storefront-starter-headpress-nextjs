/**
 * The gateways this storefront can take. This is the one file that names them: to add one, create
 * its provider under `src/integrations/<gateway>` and list it here. To remove one, delete the line
 * and the folder.
 */
import type { PaymentMethod, PlacedOrder } from "@meumouse.com/headpress";

import { cieloCardProvider, cieloPixProvider } from "@/integrations/cielo/provider";
import { paypalButtonsProvider, paypalPixProvider } from "@/integrations/paypal/provider";

import { MethodDescription } from "../components/MethodDescription";
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
  const { instructions } = order;
  if (!instructions) return null;
  return instructions.type === "pix"
    ? {
        type: "pix",
        code: instructions.code,
        imageUrl: instructions.imageBase64 ? `data:image/png;base64,${instructions.imageBase64}` : null,
        expiresAt: instructions.expiresAt,
      }
    : { type: "boleto", url: instructions.url, barcode: instructions.barcode };
}

export function providerFor(method: PaymentMethod): PaymentProvider | null {
  return [...providers, offlineProvider].find((provider) => provider.supports(method)) ?? null;
}

export function providerById(id: string): PaymentProvider | null {
  return [...providers, offlineProvider].find((provider) => provider.id === id) ?? null;
}

/** What the order still needs from the shopper, from its provider or the SDK's reading of the answer. */
export function pendingPaymentOf(provider: PaymentProvider, order: PlacedOrder): PendingPayment | null {
  return provider.pendingPayment?.(order) ?? fromInstructions(order);
}
