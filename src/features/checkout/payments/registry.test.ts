import type { PaymentMethod, PlacedOrder } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { pendingPaymentOf, providerFor } from "./registry";

function method(id: string, kind: string, config: Record<string, unknown> = {}): PaymentMethod {
  return { id, kind, config: { kind, ...config } } as unknown as PaymentMethod;
}

describe("providerFor", () => {
  it("finds each gateway's provider", () => {
    expect(providerFor(method("cielo_credit", "card"))?.id).toBe("cielo-card");
    expect(providerFor(method("cielo_pix", "pix"))?.id).toBe("cielo-pix");
    expect(providerFor(method("paypal_store_api", "wallet", { flow: "wallet" }))?.id).toBe("paypal-buttons");
  });

  it("lets methods with nothing to collect through", () => {
    expect(providerFor(method("bacs", "offline"))?.id).toBe("offline");
    expect(providerFor(method("woo-mercado-pago-pix", "pix"))?.id).toBe("offline");
  });

  it("refuses a card gateway without a form, which could never be paid", () => {
    expect(providerFor(method("some_card_gateway", "card"))).toBeNull();
  });
});

describe("pendingPaymentOf", () => {
  const offline = providerFor(method("bacs", "offline"));

  it("reads the instructions the SDK found in the answer", () => {
    const order = {
      paymentDetails: {},
      instructions: { type: "pix", code: "000201", imageBase64: "abc", expiresAt: null },
    } as unknown as PlacedOrder;

    expect(pendingPaymentOf(offline!, order)).toEqual({
      type: "pix",
      code: "000201",
      imageUrl: "data:image/png;base64,abc",
      expiresAt: null,
    });
  });

  it("is null when there is nothing to do", () => {
    const order = { paymentDetails: {}, instructions: null } as unknown as PlacedOrder;
    expect(pendingPaymentOf(offline!, order)).toBeNull();
  });
});
