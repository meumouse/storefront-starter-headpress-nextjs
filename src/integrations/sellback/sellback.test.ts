import { createHeadpress, memoryCartToken } from "@meumouse.com/headpress";
import { fixtures, json, mockHeadpress, wpError } from "@meumouse.com/headpress/testing";
import { describe, expect, it } from "vitest";

import { fetchPreferences, restoreCart, savePreferences, sellbackCartData } from "./api";
import { isSellbackTokenPath } from "./paths";

const CHANNEL = { id: "email", label: "Email", recipient_type: "email", hint: "a***", subscribed: true, locked: false };

function client(routes: Parameters<typeof mockHeadpress>[0]) {
  const server = mockHeadpress(routes);
  const hp = createHeadpress({ baseUrl: "https://wp.test", fetch: server.fetch, cartToken: memoryCartToken("token") });
  return { hp, server };
}

describe("restoreCart", () => {
  it("sends the link's token and reads the result from the cart", async () => {
    const restored = { added: 2, skipped: ["Gold ring"], payment_url: null };
    const { hp, server } = client({
      "POST /wc/store/v1/cart/extensions": () =>
        json(fixtures.storeCart({ extensions: { headpress: { sellback: { restored } } } })),
    });

    await expect(restoreCart(hp, "link-token", 42)).resolves.toEqual(restored);

    expect(await server.calls.at(-1)?.json()).toEqual({
      namespace: "headpress",
      data: { action: "sellback.restore", token: "link-token", message: 42 },
    });
  });

  it("surfaces an invalid link", async () => {
    const { hp } = client({
      "POST /wc/store/v1/cart/extensions": () => wpError(404, "sellback_invalid_link", "Expired."),
    });

    await expect(restoreCart(hp, "old", 0)).rejects.toMatchObject({ code: "sellback_invalid_link" });
  });
});

describe("preferences", () => {
  it("reads and saves channels through the plugin's namespace", async () => {
    const { hp, server } = client({
      "GET /sellback/v1/store/preferences": () => json({ channels: [CHANNEL] }),
      "PUT /sellback/v1/store/preferences": () => json({ channels: [{ ...CHANNEL, subscribed: false }] }),
    });

    await expect(fetchPreferences(hp, "abc")).resolves.toEqual([CHANNEL]);
    expect(server.calls.at(-1)?.url).toContain("token=abc");

    const saved = await savePreferences(hp, "abc", { email: false });
    expect(saved[0]?.subscribed).toBe(false);
    expect(await server.calls.at(-1)?.json()).toEqual({ token: "abc", channels: { email: false } });
  });
});

describe("sellbackCartData", () => {
  it("is empty on a store without Sellback", () => {
    expect(sellbackCartData({ extensions: {} })).toEqual({});
  });
});

describe("isSellbackTokenPath", () => {
  it("catches the pages that carry a token", () => {
    expect(isSellbackTokenPath("/cart/recover/abc.def")).toBe(true);
    expect(isSellbackTokenPath("/unsubscribe/abc")).toBe(true);
    expect(isSellbackTokenPath("/cart")).toBe(false);
  });
});
