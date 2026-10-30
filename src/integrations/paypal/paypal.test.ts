import type { PaymentMethod, PlacedOrder } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { toPayPalConfig } from "./config";
import { paypalButtonsProvider, paypalPendingPix, paypalPixProvider } from "./provider";

function method(id: string, flow: string): PaymentMethod {
  return { id, config: { flow, clientId: "client" } } as unknown as PaymentMethod;
}

describe("toPayPalConfig", () => {
  it("reads the public config with safe defaults", () => {
    expect(toPayPalConfig({ flow: "card", clientId: "client" })).toEqual({
      flow: "card",
      clientId: "client",
      intent: "capture",
      currency: "BRL",
      locale: "pt_BR",
      disableFunding: "",
    });
  });

  it("is null without a known flow", () => {
    expect(toPayPalConfig({})).toBeNull();
    expect(toPayPalConfig({ flow: "other" })).toBeNull();
  });
});

describe("providers", () => {
  it("routes each flow to the right provider", () => {
    expect(paypalButtonsProvider.supports(method("paypal_store_api", "wallet"))).toBe(true);
    expect(paypalButtonsProvider.supports(method("paypal_store_api_card", "card"))).toBe(true);
    expect(paypalButtonsProvider.supports(method("paypal_store_api_pix", "pix"))).toBe(false);
    expect(paypalPixProvider.supports(method("paypal_store_api_pix", "pix"))).toBe(true);
  });

  it("leaves other gateways alone", () => {
    expect(paypalButtonsProvider.supports(method("stripe", "wallet"))).toBe(false);
  });
});

describe("paypalPendingPix", () => {
  it("turns the Unix expiry into ISO and an empty image into null", () => {
    const order = { paymentDetails: { pix_code: "000201", pix_image: "", pix_expires_at: "1790000000" } };

    expect(paypalPendingPix(order as unknown as PlacedOrder)).toEqual({
      type: "pix",
      code: "000201",
      imageUrl: null,
      expiresAt: new Date(1790000000 * 1000).toISOString(),
    });
  });
});
