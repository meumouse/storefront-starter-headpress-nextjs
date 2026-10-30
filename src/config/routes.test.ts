import { expandRoute } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { paths, STOREFRONT_ROUTES } from "./routes";

describe("route helpers", () => {
  it("build the URLs Headpress builds from the same patterns", () => {
    expect(paths.product("mug")).toBe(expandRoute(STOREFRONT_ROUTES.product, { slug: "mug" }));
    expect(paths.category("home")).toBe(expandRoute(STOREFRONT_ROUTES.product_cat, { slug: "home" }));
    expect(paths.order(7)).toBe(expandRoute(STOREFRONT_ROUTES.account_order, { order_id: 7 }));
    expect(paths.orderReceived(7, "wc_order_x")).toBe(
      expandRoute(STOREFRONT_ROUTES.order_received, { order_id: 7, order_key: "wc_order_x" }),
    );
  });
});
