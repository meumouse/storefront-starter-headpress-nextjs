import type { Product } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { defaultSelection, findVariationId, isTermAvailable } from "./variations";

function attribute(name: string, slugs: string[], defaultSlug?: string) {
  return {
    id: name.length,
    name,
    taxonomy: `pa_${name.toLowerCase()}`,
    hasVariations: true,
    terms: slugs.map((slug, id) => ({ id, name: slug, slug, isDefault: slug === defaultSlug })),
  };
}

const product = {
  attributes: [attribute("Color", ["sand", "ink"], "sand"), attribute("Size", ["s", "m"])],
  variations: [
    { id: 1, attributes: [{ name: "Color", value: "sand" }, { name: "Size", value: "s" }] },
    { id: 2, attributes: [{ name: "Color", value: "sand" }, { name: "Size", value: "m" }] },
    // WooCommerce's "any size".
    { id: 3, attributes: [{ name: "Color", value: "ink" }, { name: "Size", value: null }] },
  ],
} as Pick<Product, "attributes" | "variations">;

describe("findVariationId", () => {
  it("waits for a complete selection", () => {
    expect(findVariationId(product, { Color: "sand" })).toBeNull();
  });

  it("matches exact values and wildcards", () => {
    expect(findVariationId(product, { Color: "sand", Size: "m" })).toBe(2);
    expect(findVariationId(product, { Color: "ink", Size: "s" })).toBe(3);
  });
});

describe("defaultSelection", () => {
  it("starts from the defaults WooCommerce sets", () => {
    expect(defaultSelection(product)).toEqual({ Color: "sand" });
  });
});

describe("isTermAvailable", () => {
  it("disables a term when every variation with it is sold out", () => {
    const soldOut = new Set([2]);

    expect(isTermAvailable(product, { Color: "sand" }, "Size", "m", soldOut)).toBe(false);
    expect(isTermAvailable(product, { Color: "sand" }, "Size", "s", soldOut)).toBe(true);
    // Another color still has size M.
    expect(isTermAvailable(product, { Color: "ink" }, "Size", "m", soldOut)).toBe(true);
  });
});
