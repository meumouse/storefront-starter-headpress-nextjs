import { describe, expect, it } from "vitest";

import { clearFiltersHref, listingHref, sortOf, toggleTermHref, toProductQuery } from "./listing-query";

describe("toProductQuery", () => {
  it("turns the URL into a Store API query, over what the page fixes", () => {
    const query = toProductQuery(
      { sort: "price-asc", page: "2", on_sale: "1", attr_pa_color: "sand,ink" },
      { category: 11 },
    );

    expect(query).toMatchObject({
      category: 11,
      orderby: "price",
      order: "asc",
      page: 2,
      onSale: true,
      attributes: [{ attribute: "pa_color", terms: ["sand", "ink"], operator: "in" }],
    });
  });

  it("ignores values it does not know", () => {
    expect(sortOf({ sort: "nonsense" })).toBe("latest");
    expect(toProductQuery({ page: "-3" }).page).toBe(1);
  });
});

describe("listing links", () => {
  it("goes back to page 1 when a filter changes", () => {
    expect(listingHref("/shop", { page: "3", sort: "rating" }, { on_sale: "1" })).toBe("/shop?sort=rating&on_sale=1");
  });

  it("toggles a term on and off", () => {
    expect(toggleTermHref("/shop", {}, "pa_color", "sand")).toBe("/shop?attr_pa_color=sand");
    expect(toggleTermHref("/shop", { attr_pa_color: "sand" }, "pa_color", "sand")).toBe("/shop");
  });

  it("clears filters and keeps the search", () => {
    expect(clearFiltersHref("/search", { q: "mug", on_sale: "1", attr_pa_size: "m" })).toBe("/search?q=mug");
  });
});
