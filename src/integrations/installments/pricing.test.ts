import { normalizeProduct } from "@meumouse.com/headpress";
import { fixtures } from "@meumouse.com/headpress/testing";
import { describe, expect, it } from "vitest";

import { cartUpfrontTotal, installmentPlans, priceHighlights } from "./pricing";

const PLUGIN_DATA = {
  installments: [
    { count: 1, amount: "30000", total: "30000", has_interest: false },
    { count: 3, amount: "10000", total: "30000", has_interest: false },
  ],
  best_installments: {
    without_interest: { count: 3, amount: "10000", total: "30000", has_interest: false },
    with_interest: null,
  },
  discounts: { main: { price: "27000", savings: "3000", text_after: "no Pix" } },
};

function product(extensions: Record<string, unknown>) {
  return normalizeProduct(fixtures.storeProduct({ extensions }));
}

describe("priceHighlights", () => {
  it("prefers the Headpress preview", () => {
    const highlights = priceHighlights(
      product({
        "wc-custom-installments": PLUGIN_DATA,
        headpress: {
          installments: {
            price_preview: {
              price: 30000,
              currency: "BRL",
              pix: { price: 28500, discount: 1500, percent: 5 },
              installments: { count: 6, amount: 5000, total: 30000, interest_free: true },
            },
          },
        },
      }),
    );

    expect(highlights.upfront?.price.amount).toBe(28500);
    expect(highlights.installment).toMatchObject({ count: 6, interestFree: true });
  });

  it("falls back to the plugin's own data, keeping its wording", () => {
    const highlights = priceHighlights(product({ "wc-custom-installments": PLUGIN_DATA }));

    expect(highlights.upfront).toMatchObject({ label: "no Pix" });
    expect(highlights.upfront?.price.amount).toBe(27000);
    expect(highlights.installment?.count).toBe(3);
  });

  it("shows nothing without the plugin", () => {
    expect(priceHighlights(product({}))).toEqual({ upfront: null, installment: null });
  });
});

describe("installmentPlans", () => {
  it("normalizes the table to Money", () => {
    const plans = installmentPlans(product({ "wc-custom-installments": PLUGIN_DATA }));

    expect(plans.map((plan) => plan.count)).toEqual([1, 3]);
    expect(plans[1]?.amount.amount).toBe(10000);
  });
});

describe("cartUpfrontTotal", () => {
  it("reads the upfront total of the cart", () => {
    const cart = {
      currency: { code: "BRL", minor_unit: 2 },
      extensions: { "wc-custom-installments": { discounts: { main: { total: "9500", text_after: "no Pix" } } } },
    };

    expect(cartUpfrontTotal(cart)).toMatchObject({ label: "no Pix", total: { amount: 9500 } });
  });

  it("answers null without the plugin", () => {
    expect(cartUpfrontTotal({ currency: { code: "BRL" }, extensions: {} })).toBeNull();
  });
});
