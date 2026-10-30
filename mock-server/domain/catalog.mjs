/** Turns the demo catalog into WooCommerce Store API payloads, the way plugins extend them. */
import { fixtures } from "@meumouse.com/headpress/testing";

import { categories, products, tags } from "../data/products.mjs";

const CURRENCY = {
  currency_code: "BRL",
  currency_symbol: "R$",
  currency_minor_unit: 2,
  currency_decimal_separator: ",",
  currency_thousand_separator: ".",
  currency_prefix: "R$ ",
  currency_suffix: "",
};

const PIX_PERCENT = 5;
const INTEREST_FREE_UP_TO = 6;
const MAX_INSTALLMENTS = 10;
const MONTHLY_RATE = 0.0199;
const MIN_INSTALLMENT = 2000;

/** Installment plans, as Parcelas Customizadas computes them. */
export function installmentPlans(price) {
  const plans = [];
  for (let count = 1; count <= MAX_INSTALLMENTS; count++) {
    const hasInterest = count > INTEREST_FREE_UP_TO;
    const amount = hasInterest
      ? Math.round((price * MONTHLY_RATE) / (1 - (1 + MONTHLY_RATE) ** -count))
      : Math.round(price / count);
    if (count > 1 && amount < MIN_INSTALLMENT) break;
    plans.push({ count, amount, total: amount * count, has_interest: hasInterest });
  }
  return plans;
}

/** `extensions.wc-custom-installments` of a product. */
function installmentsExtension(price) {
  const plans = installmentPlans(price);
  const toStore = (plan) => plan && { ...plan, amount: String(plan.amount), total: String(plan.total) };
  const upfront = Math.round(price * (1 - PIX_PERCENT / 100));
  return {
    installments: plans.map(toStore),
    best_installments: {
      without_interest: toStore(plans.filter((plan) => !plan.has_interest).at(-1)) ?? null,
      with_interest: toStore(plans.filter((plan) => plan.has_interest).at(-1)) ?? null,
    },
    discounts: {
      main: { price: String(upfront), savings: String(price - upfront), text_before: "", text_after: "with Pix" },
      ticket: null,
    },
    labels: { without_interest: "interest-free", with_interest: "with interest" },
    currency_code: "BRL",
    currency_minor_unit: 2,
  };
}

/** `extensions.headpress.installments.price_preview` of a product. */
function pricePreview(price) {
  const best = installmentPlans(price).filter((plan) => !plan.has_interest).at(-1);
  const upfront = Math.round(price * (1 - PIX_PERCENT / 100));
  return {
    price,
    currency: "BRL",
    pix: { price: upfront, discount: price - upfront, percent: PIX_PERCENT },
    ticket: null,
    installments: best ? { count: best.count, amount: best.amount, total: best.total, interest_free: true } : null,
    min_installment: MIN_INSTALLMENT,
  };
}

function storeImage(baseUrl, product, index = 0, label = product.name) {
  const src = `${baseUrl}/media/${product.slug}-${index}.svg?hue=${product.hue + index * 24}`;
  return { id: product.id * 10 + index, src, thumbnail: src, srcset: "", sizes: "", name: label, alt: label };
}

function prices(price, regular = price, range = null) {
  return {
    ...CURRENCY,
    price: String(price),
    regular_price: String(regular),
    sale_price: String(price),
    price_range: range,
  };
}

function extensions(price) {
  return {
    "wc-custom-installments": installmentsExtension(price),
    headpress: { installments: { price_preview: pricePreview(price) } },
  };
}

function attributesOf(product) {
  return Object.entries(product.options ?? {}).map(([name, values], attributeIndex) => ({
    id: attributeIndex + 1,
    name: name === "color" ? "Color" : "Size",
    taxonomy: `pa_${name}`,
    has_variations: true,
    terms: values.map((value, termIndex) => ({
      id: (attributeIndex + 1) * 100 + termIndex,
      name: value,
      slug: value.toLowerCase(),
      default: false,
    })),
  }));
}

/** Every combination of a product's options, with stable ids. */
function combinations(product) {
  const entries = Object.entries(product.options ?? {});
  const first = [[]];
  return entries.reduce(
    (all, [name, values]) => all.flatMap((chosen) => values.map((value) => [...chosen, { name, value }])),
    first,
  );
}

function variationId(product, index) {
  return product.id * 100 + index;
}

function baseProduct(product, baseUrl) {
  const price = product.price;
  return fixtures.storeProduct({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: `HP-${product.id}`,
    permalink: `${baseUrl}/product/${product.slug}/`,
    short_description: `<p>${product.summary}</p>`,
    description: `<p>${product.summary}</p><p>This is demo content from the mock WordPress. Your real product descriptions, written in WooCommerce, appear here.</p>`,
    on_sale: Boolean(product.regular),
    prices: prices(price, product.regular ?? price),
    average_rating: String(product.rating),
    review_count: product.reviews,
    images: [0, 1, 2].map((index) => storeImage(baseUrl, product, index)),
    categories: categories
      .filter((category) => category.slug === product.category)
      .map(({ id, name, slug }) => ({ id, name, slug, link: "" })),
    tags: tags.filter((tag) => product.tags.includes(tag.slug)).map(({ id, name, slug }) => ({ id, name, slug, link: "" })),
    is_purchasable: !product.soldOut,
    is_in_stock: !product.soldOut,
    stock_availability: { text: product.soldOut ? "Out of stock" : "", class: product.soldOut ? "out-of-stock" : "in-stock" },
    extensions: extensions(price),
  });
}

export function toStoreProduct(product, baseUrl) {
  const base = baseProduct(product, baseUrl);
  if (!product.options) return base;

  return {
    ...base,
    type: "variable",
    has_options: true,
    prices: prices(product.price, product.price, {
      min_amount: String(product.price),
      max_amount: String(product.price),
    }),
    attributes: attributesOf(product),
    variations: combinations(product).map((chosen, index) => ({
      id: variationId(product, index),
      attributes: chosen.map(({ name, value }) => ({ name: name === "color" ? "Color" : "Size", value: value.toLowerCase() })),
    })),
  };
}

export function toStoreVariation(product, baseUrl, chosen, index) {
  const label = chosen.map(({ name, value }) => `${name === "color" ? "Color" : "Size"}: ${value}`).join(", ");
  // The last combination is sold out, so the UI has something to disable.
  const soldOut = index === combinations(product).length - 1;
  const variation = baseProduct(product, baseUrl);

  return {
    ...variation,
    id: variationId(product, index),
    parent: product.id,
    type: "variation",
    variation: label,
    is_purchasable: !soldOut,
    is_in_stock: !soldOut,
    stock_availability: { text: soldOut ? "Out of stock" : "", class: soldOut ? "out-of-stock" : "in-stock" },
  };
}

export function allVariations(product, baseUrl) {
  return combinations(product).map((chosen, index) => toStoreVariation(product, baseUrl, chosen, index));
}

/** A product or variation by id, for the cart and checkout. */
export function findSellable(id, baseUrl) {
  const simple = products.find((product) => product.id === id);
  if (simple) return { product: simple, store: toStoreProduct(simple, baseUrl) };

  const parent = products.find((product) => product.id === Math.floor(id / 100));
  if (!parent?.options) return null;
  const store = allVariations(parent, baseUrl).find((variation) => variation.id === id);
  return store ? { product: parent, store } : null;
}

export function findProduct(idOrSlug) {
  const key = String(idOrSlug);
  return products.find((product) => String(product.id) === key || product.slug === key) ?? null;
}

function matchesAttributes(product, params) {
  for (let index = 0; params.has(`attributes[${index}][attribute]`); index++) {
    const taxonomy = params.get(`attributes[${index}][attribute]`).replace(/^pa_/, "");
    const wanted = [...params.entries()]
      .filter(([key]) => key.startsWith(`attributes[${index}][slug]`))
      .map(([, value]) => value);
    const offered = (product.options?.[taxonomy] ?? []).map((value) => value.toLowerCase());
    if (wanted.length > 0 && !wanted.some((value) => offered.includes(value))) return false;
  }
  return true;
}

function matchesTerm(value, terms, productTerms) {
  if (!value) return true;
  return value.split(",").some((entry) => {
    const term = terms.find((candidate) => candidate.slug === entry || String(candidate.id) === entry);
    return term ? productTerms.includes(term.slug) : false;
  });
}

const SORTERS = {
  price: (a, b) => a.price - b.price,
  title: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => b.rating - a.rating,
  popularity: (a, b) => b.reviews - a.reviews,
  date: (a, b) => b.id - a.id,
};

export function filterProducts(params) {
  const search = params.get("search")?.toLowerCase();
  const minPrice = Number(params.get("min_price") ?? 0);
  const maxPrice = Number(params.get("max_price") ?? Number.MAX_SAFE_INTEGER);
  const included = [...params.entries()].filter(([key]) => key.startsWith("include[")).map(([, value]) => Number(value));

  const found = products.filter(
    (product) =>
      matchesTerm(params.get("category"), categories, [product.category]) &&
      matchesTerm(params.get("tag"), tags, product.tags) &&
      (!search || product.name.toLowerCase().includes(search) || product.summary.toLowerCase().includes(search)) &&
      (params.get("on_sale") !== "true" || Boolean(product.regular)) &&
      (params.get("featured") !== "true" || product.featured) &&
      product.price >= minPrice &&
      product.price <= maxPrice &&
      (included.length === 0 || included.includes(product.id)) &&
      matchesAttributes(product, params),
  );

  const sorter = SORTERS[params.get("orderby") ?? "date"] ?? SORTERS.date;
  const sorted = [...found].sort(sorter);
  return params.get("order") === "desc" && params.get("orderby") === "price" ? sorted.reverse() : sorted;
}

export function storeCategories(baseUrl) {
  return categories.map((category) => {
    const sample = products.find((product) => product.category === category.slug);
    return {
      ...category,
      parent: 0,
      count: products.filter((product) => product.category === category.slug).length,
      image: sample ? storeImage(baseUrl, sample) : null,
      permalink: "",
    };
  });
}

export function storeTags() {
  return tags.map((tag) => ({
    ...tag,
    description: "",
    parent: 0,
    count: products.filter((product) => product.tags.includes(tag.slug)).length,
    image: null,
    permalink: "",
  }));
}

/** A soft geometric placeholder, so the demo ships no binary images. */
export function placeholderImage(name, hue) {
  const seed = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const cx = 300 + (seed % 200);
  const cy = 280 + (seed % 240);
  const radius = 170 + (seed % 90);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="hsl(${hue} 32% 88%)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="hsl(${hue} 38% 66%)"/>
  <rect x="${cx - radius * 0.6}" y="${cy + radius * 0.2}" width="${radius * 1.5}" height="${radius * 0.9}" rx="28" fill="hsl(${hue} 44% 42%)" opacity="0.85"/>
</svg>`;
}
