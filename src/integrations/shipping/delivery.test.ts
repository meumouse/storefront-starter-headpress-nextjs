import type { ShippingRate } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { rateDelivery } from "./delivery";

const rate = { id: "pac", packageId: 0, deliveryTime: "" } as ShippingRate;

describe("rateDelivery", () => {
  it("reads the estimate Headpress adds to the cart", () => {
    const extensions = {
      headpress: {
        shipping: {
          packages: [{ package_id: 0, rates: [{ rate_id: "pac", delivery: { headline: "In 6 days" } }] }],
        },
      },
    };
    expect(rateDelivery({ extensions }, rate)).toBe("In 6 days");
  });

  it("falls back to the carrier's own delivery time", () => {
    expect(rateDelivery({ extensions: {} }, { ...rate, deliveryTime: "2 days" })).toBe("2 days");
  });

  it("answers null when nobody says", () => {
    expect(rateDelivery({ extensions: {} }, rate)).toBeNull();
  });
});
