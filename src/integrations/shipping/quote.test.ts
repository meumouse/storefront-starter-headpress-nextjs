import { createHeadpress } from "@meumouse.com/headpress";
import { fixtures, json, mockHeadpress, wpError } from "@meumouse.com/headpress/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { quoteProductShipping, resetShippingSource } from "./quote";

const CALCULATE_BODY = {
  status: "success",
  rates: [
    {
      id: "pac",
      method_id: "correios",
      instance_id: 1,
      label: "PAC",
      cost: 21.9,
      is_free: false,
      delivery: { headline: "Arrives in up to 6 days", label: "6 days" },
    },
  ],
};

const INPUT = { productId: 12, postcode: "01310-100" };

function client(routes: Parameters<typeof mockHeadpress>[0]) {
  const server = mockHeadpress({
    "GET /headpress/v1/store/config": () =>
      json(fixtures.storeConfig({ commerce: { currency: { code: "BRL", minor_unit: 2 } } as never })),
    ...routes,
  });
  return { hp: createHeadpress({ baseUrl: "https://wp.test", fetch: server.fetch }), server };
}

describe("quoteProductShipping", () => {
  beforeEach(() => resetShippingSource());

  it("reads Envora and converts decimal costs to minor units", async () => {
    const { hp, server } = client({ "POST /envora/v1/shipping/calculate": () => json(CALCULATE_BODY) });

    const [rate] = await quoteProductShipping(hp, INPUT);

    expect(rate).toMatchObject({ id: "pac", isFree: false, delivery: "Arrives in up to 6 days" });
    expect(rate?.cost.amount).toBe(2190);

    const sent = new URLSearchParams(await server.calls[0]?.text());
    expect(sent.get("postcode")).toBe("01310100");
    expect(sent.get("product")).toBe("12");
  });

  it("falls back to HubGo when Envora is not installed", async () => {
    const { hp, server } = client({ "POST /hubgo/v1/shipping/calculate": () => json(CALCULATE_BODY) });

    const rates = await quoteProductShipping(hp, INPUT);
    expect(rates).toHaveLength(1);

    // The next quote goes straight to the route that answered.
    server.calls.length = 0;
    await quoteProductShipping(hp, INPUT);
    expect(server.calls).toHaveLength(1);
    expect(new URL(server.calls[0]?.url ?? "").pathname).toContain("hubgo/v1");
  });

  it("falls back to the Headpress quote when neither plugin is installed", async () => {
    const { hp } = client({
      "POST /headpress/v1/store/shipping/quote": () =>
        json({
          currency: "BRL",
          rates: [{ id: "flat_rate:1", method_id: "flat_rate", instance_id: 1, label: "Flat rate", cost: 1500, taxes: 0 }],
        }),
    });
    await hp.config.get();

    const [rate] = await quoteProductShipping(hp, INPUT);

    expect(rate).toMatchObject({ id: "flat_rate:1", delivery: null });
    expect(rate?.cost.amount).toBe(1500);
  });

  it("does not move on when the plugin refuses the quote", async () => {
    const { hp } = client({
      "POST /envora/v1/shipping/calculate": () => wpError(400, "envora_invalid_postcode", "Invalid postcode."),
      "POST /hubgo/v1/shipping/calculate": () => json(CALCULATE_BODY),
    });

    await expect(quoteProductShipping(hp, INPUT)).rejects.toMatchObject({ code: "envora_invalid_postcode" });
  });
});
