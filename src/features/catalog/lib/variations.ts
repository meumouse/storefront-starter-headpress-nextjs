import type { Product } from "@meumouse.com/headpress";

/** Attribute name → selected term slug. */
export type VariationSelection = Record<string, string>;

type VariationRef = Product["variations"][number];

function sameAttribute(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function allows(variation: VariationRef, name: string, value: string): boolean {
  const attribute = variation.attributes.find((entry) => sameAttribute(entry.name, name));
  // A variation with no value for an attribute accepts any of its terms.
  return !attribute || attribute.value === null || attribute.value === value;
}

/** Attributes the shopper has to choose. */
export function selectableAttributes(product: Pick<Product, "attributes">) {
  return product.attributes.filter((attribute) => attribute.hasVariations);
}

/** The variation matching a complete selection, or null while something is unselected. */
export function findVariationId(
  product: Pick<Product, "attributes" | "variations">,
  selection: VariationSelection,
): number | null {
  const attributes = selectableAttributes(product);
  if (attributes.some((attribute) => !selection[attribute.name])) return null;

  const match = product.variations.find((variation) =>
    attributes.every((attribute) => allows(variation, attribute.name, selection[attribute.name] ?? "")),
  );
  return match?.id ?? null;
}

/**
 * The `variation` of the Store API's `add-item`: a global attribute goes by its taxonomy (`pa_color`),
 * one defined on the product by its name, and the value is the term.
 */
export function addItemVariation(
  product: Pick<Product, "attributes">,
  selection: VariationSelection,
): { attribute: string; value: string }[] {
  return selectableAttributes(product).map((attribute) => ({
    attribute: attribute.taxonomy ?? attribute.name,
    value: selection[attribute.name] ?? "",
  }));
}

/** The selection a product opens with, from the defaults WooCommerce sets. */
export function defaultSelection(product: Pick<Product, "attributes">): VariationSelection {
  const selection: VariationSelection = {};
  for (const attribute of selectableAttributes(product)) {
    const term = attribute.terms.find((entry) => entry.isDefault);
    if (term) selection[attribute.name] = term.slug;
  }
  return selection;
}

/**
 * Whether a term can still be bought, given what is selected in the other attributes. `soldOut` are
 * the variation ids out of stock.
 */
export function isTermAvailable(
  product: Pick<Product, "attributes" | "variations">,
  selection: VariationSelection,
  name: string,
  slug: string,
  soldOut: ReadonlySet<number>,
): boolean {
  const others = selectableAttributes(product).filter((attribute) => attribute.name !== name);
  return product.variations.some(
    (variation) =>
      !soldOut.has(variation.id) &&
      allows(variation, name, slug) &&
      others.every((attribute) => {
        const chosen = selection[attribute.name];
        return !chosen || allows(variation, attribute.name, chosen);
      }),
  );
}
