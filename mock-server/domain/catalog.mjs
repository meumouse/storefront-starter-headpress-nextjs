/** Turns the demo catalog into WooCommerce Store API payloads, the way plugins extend them. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixtures } from "@meumouse.com/headpress/testing";

import { attributes, categories, products, tags } from "../data/products.mjs";

/** Product photos for the demo, kept out of Git: see `mock-server/photos/README.md`. */
const PHOTOS = fileURLToPath(new URL("../photos/", import.meta.url));
const PHOTO_TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

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

function photoType(file) {
  return PHOTO_TYPES[path.extname(file).toLowerCase()] ?? null;
}

/** `photos.json`: product slug → photo URLs. Read on every call, so edits show without a restart. */
function photoLinks() {
  try {
    return JSON.parse(readFileSync(path.join(PHOTOS, "photos.json"), "utf8"));
  } catch {
    return {};
  }
}

/**
 * A product's photos as media file names, `<slug>-<n>.<ext>`. Files in the folder win over the links of
 * `photos.json`; a product with neither is drawn.
 */
function photosOf(product) {
  const name = new RegExp(`^${product.slug}-(\\d+)\\.`, "i");
  const files = existsSync(PHOTOS)
    ? readdirSync(PHOTOS).filter((file) => photoType(file) && name.test(file))
    : [];
  if (files.length > 0) return files.sort((a, b) => Number(a.match(name)[1]) - Number(b.match(name)[1]));
  return (photoLinks()[product.slug] ?? []).map(
    (url, index) => `${product.slug}-${index + 1}${path.extname(new URL(url).pathname) || ".jpg"}`,
  );
}

/** Where the media route finds a photo: a file on disk or a link. Null means it is a drawing. */
export function photoSource(file) {
  const type = photoType(file);
  if (!type || path.basename(file) !== file) return null;
  const full = path.join(PHOTOS, file);
  if (existsSync(full)) return { path: full, type };
  const match = file.match(/^(.+)-(\d+)\.[a-z]+$/i);
  const url = match ? photoLinks()[match[1]]?.[Number(match[2]) - 1] : null;
  return url ? { url, type } : null;
}

function storeImage(baseUrl, product, index = 0, label = product.name) {
  const photo = photosOf(product)[index];
  const src = photo
    ? `${baseUrl}/media/${photo}`
    : `${baseUrl}/media/${product.slug}-${index}.svg?hue=${product.hue + index * 24}`;
  return { id: product.id * 10 + index, src, thumbnail: src, srcset: "", sizes: "", name: label, alt: label };
}

function imageIndexes(product) {
  const photos = photosOf(product).length;
  return photos > 0 ? [...Array(photos).keys()] : [0, 1, 2];
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

/** The slug WooCommerce gives a term: `256 GB` → `256-gb`. */
export function termSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function attributeName(key) {
  return attributes.find((attribute) => attribute.key === key)?.name ?? key;
}

function attributeId(key) {
  return attributes.find((attribute) => attribute.key === key)?.id ?? 0;
}

/** Every value of a global attribute across the catalog, for the attribute terms route. */
export function attributeTerms(id) {
  const attribute = attributes.find((entry) => String(entry.id) === String(id));
  if (!attribute) return [];
  const values = [...new Set(products.flatMap((product) => product.options?.[attribute.key] ?? []))];
  return values.map((value, index) => ({
    id: attribute.id * 100 + index,
    name: value,
    slug: termSlug(value),
    count: products.filter((product) => product.options?.[attribute.key]?.includes(value)).length,
    description: "",
  }));
}

/** What a chosen combination costs: the base price plus what each value adds. */
function priceOf(product, chosen = []) {
  return chosen.reduce((total, { name, value }) => {
    const index = product.options?.[name]?.indexOf(value) ?? -1;
    return total + (product.optionPrices?.[name]?.[index] ?? 0);
  }, product.price);
}

/** Cheapest and dearest combination of a variable product. */
function priceRangeOf(product) {
  const amounts = combinations(product).map((chosen) => priceOf(product, chosen));
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

function extensions(price) {
  return {
    "wc-custom-installments": installmentsExtension(price),
    headpress: { installments: { price_preview: pricePreview(price) } },
  };
}

function attributesOf(product) {
  return Object.entries(product.options ?? {}).map(([name, values]) => ({
    id: attributeId(name),
    name: attributeName(name),
    taxonomy: `pa_${name}`,
    has_variations: true,
    terms: values.map((value) => {
      const term = attributeTerms(attributeId(name)).find((entry) => entry.name === value);
      return { id: term?.id ?? 0, name: value, slug: termSlug(value), default: false };
    }),
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

function baseProduct(product, baseUrl, price = product.price) {
  return fixtures.storeProduct({
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: `HP-${product.id}`,
    permalink: `${baseUrl}/product/${product.slug}/`,
    short_description: `<p>${product.summary}</p>`,
    description: `<p>${product.summary}</p><p>This is demo content from the mock WordPress. Your real product descriptions, written in WooCommerce, appear here.</p>`,
    on_sale: Boolean(product.regular),
    prices: prices(price, product.regular ? product.regular + (price - product.price) : price),
    average_rating: String(product.rating),
    review_count: product.reviews,
    images: imageIndexes(product).map((index) => storeImage(baseUrl, product, index)),
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

  const range = priceRangeOf(product);
  return {
    ...base,
    type: "variable",
    has_options: true,
    prices: prices(range.min, product.regular ?? range.min, {
      min_amount: String(range.min),
      max_amount: String(range.max),
    }),
    attributes: attributesOf(product),
    variations: combinations(product).map((chosen, index) => ({
      id: variationId(product, index),
      attributes: chosen.map(({ name, value }) => ({ name: attributeName(name), value: termSlug(value) })),
    })),
  };
}

export function toStoreVariation(product, baseUrl, chosen, index) {
  const label = chosen.map(({ name, value }) => `${attributeName(name)}: ${value}`).join(", ");
  // The last combination is sold out, so the UI has something to disable.
  const soldOut = index === combinations(product).length - 1;
  const variation = baseProduct(product, baseUrl, priceOf(product, chosen));

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
    const offered = (product.options?.[taxonomy] ?? []).map(termSlug);
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

  if (params.get("orderby") === "include") {
    return [...found].sort((a, b) => included.indexOf(a.id) - included.indexOf(b.id));
  }
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

/** The device each placeholder draws, by product shape. Coordinates are on an 800 × 800 canvas. */
const DEVICES = {
  phone: ({ body, screen, accent }) => `
    <rect x="270" y="130" width="260" height="540" rx="44" fill="${body}"/>
    <rect x="286" y="150" width="228" height="500" rx="32" fill="${screen}"/>
    <rect x="370" y="166" width="60" height="16" rx="8" fill="${body}"/>
    <circle cx="400" cy="400" r="70" fill="${accent}" opacity="0.55"/>`,
  foldable: ({ body, screen, accent }) => `
    <rect x="300" y="170" width="200" height="460" rx="36" fill="${body}"/>
    <rect x="316" y="186" width="168" height="200" rx="22" fill="${screen}"/>
    <rect x="300" y="396" width="200" height="8" fill="${accent}"/>
    <circle cx="400" cy="520" r="26" fill="${accent}" opacity="0.6"/>`,
  case: ({ body, screen, accent }) => `
    <rect x="270" y="130" width="260" height="540" rx="48" fill="none" stroke="${body}" stroke-width="18"/>
    <rect x="300" y="170" width="90" height="110" rx="28" fill="${screen}"/>
    <circle cx="330" cy="205" r="18" fill="${accent}"/><circle cx="362" cy="245" r="18" fill="${accent}"/>`,
  glass: ({ body, screen }) => `
    <rect x="250" y="120" width="300" height="560" rx="48" fill="${screen}" opacity="0.7" transform="rotate(-8 400 400)"/>
    <rect x="290" y="150" width="300" height="560" rx="48" fill="none" stroke="${body}" stroke-width="10" transform="rotate(6 400 400)"/>`,
  tablet: ({ body, screen, accent }) => `
    <rect x="200" y="140" width="400" height="520" rx="36" fill="${body}"/>
    <rect x="220" y="160" width="360" height="480" rx="20" fill="${screen}"/>
    <circle cx="400" cy="400" r="90" fill="${accent}" opacity="0.5"/>`,
  laptop: ({ body, screen, accent }) => `
    <rect x="180" y="210" width="440" height="290" rx="22" fill="${body}"/>
    <rect x="198" y="228" width="404" height="254" rx="10" fill="${screen}"/>
    <path d="M130 520 H670 L640 570 H160 Z" fill="${body}"/>
    <rect x="360" y="520" width="80" height="10" rx="5" fill="${accent}"/>`,
  gpu: ({ body, screen, accent }) => `
    <rect x="130" y="270" width="540" height="240" rx="28" fill="${body}"/>
    <circle cx="260" cy="390" r="82" fill="${screen}"/><circle cx="260" cy="390" r="22" fill="${accent}"/>
    <circle cx="470" cy="390" r="82" fill="${screen}"/><circle cx="470" cy="390" r="22" fill="${accent}"/>
    <rect x="190" y="510" width="300" height="30" fill="${accent}"/>`,
  chip: ({ body, screen, accent }) => `
    <rect x="160" y="320" width="480" height="160" rx="16" fill="${body}"/>
    <rect x="200" y="350" width="110" height="100" rx="8" fill="${screen}"/>
    <rect x="340" y="350" width="110" height="100" rx="8" fill="${screen}"/>
    <rect x="590" y="340" width="30" height="120" rx="6" fill="${accent}"/>`,
  card: ({ body, screen, accent }) => `
    <path d="M300 200 H470 L520 250 V600 H300 Z" fill="${body}"/>
    <rect x="330" y="390" width="160" height="170" rx="10" fill="${screen}"/>
    ${[0, 1, 2, 3, 4].map((index) => `<rect x="${320 + index * 32}" y="230" width="16" height="60" rx="4" fill="${accent}"/>`).join("")}`,
  console: ({ body, screen, accent }) => `
    <path d="M300 130 Q400 100 500 130 L520 670 H280 Z" fill="${screen}"/>
    <rect x="360" y="150" width="80" height="500" rx="20" fill="${body}"/>
    <rect x="380" y="560" width="40" height="8" rx="4" fill="${accent}"/>`,
  gamepad: ({ body, screen, accent }) => `
    <path d="M220 330 Q400 270 580 330 Q680 360 650 520 Q630 600 560 560 L500 500 H300 L240 560 Q170 600 150 520 Q120 360 220 330 Z" fill="${body}"/>
    <rect x="245" y="390" width="70" height="22" rx="6" fill="${screen}"/><rect x="269" y="366" width="22" height="70" rx="6" fill="${screen}"/>
    ${[[520, 370], [560, 400], [520, 430], [480, 400]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${accent}"/>`).join("")}`,
  wheel: ({ body, screen, accent }) => `
    <circle cx="400" cy="380" r="220" fill="none" stroke="${body}" stroke-width="54"/>
    <rect x="200" y="360" width="400" height="44" rx="22" fill="${body}"/>
    <circle cx="400" cy="382" r="64" fill="${screen}"/>
    <circle cx="400" cy="160" r="14" fill="${accent}"/>`,
  game: ({ body, screen, accent }) => `
    <rect x="250" y="130" width="300" height="540" rx="18" fill="${body}"/>
    <rect x="270" y="190" width="260" height="380" rx="8" fill="${screen}"/>
    <path d="M300 520 L400 300 L500 520 Z" fill="${accent}" opacity="0.75"/>`,
  airfryer: ({ body, screen, accent }) => `
    <path d="M250 200 Q400 150 550 200 L580 640 H220 Z" fill="${body}"/>
    <rect x="300" y="260" width="200" height="90" rx="20" fill="${screen}"/>
    <rect x="270" y="400" width="260" height="190" rx="24" fill="${screen}" opacity="0.6"/>
    <rect x="360" y="470" width="80" height="22" rx="11" fill="${accent}"/>`,
  blender: ({ body, screen, accent }) => `
    <path d="M300 160 H520 L490 470 H330 Z" fill="${screen}" opacity="0.75"/>
    <rect x="290" y="140" width="240" height="30" rx="12" fill="${body}"/>
    <rect x="300" y="470" width="220" height="190" rx="28" fill="${body}"/>
    <circle cx="410" cy="565" r="34" fill="${accent}"/>`,
  washer: ({ body, screen, accent }) => `
    <rect x="200" y="140" width="400" height="520" rx="28" fill="${body}"/>
    <rect x="220" y="160" width="360" height="70" rx="12" fill="${screen}"/>
    <circle cx="400" cy="430" r="150" fill="${screen}"/><circle cx="400" cy="430" r="100" fill="${accent}" opacity="0.55"/>`,
  fridge: ({ body, screen, accent }) => `
    <rect x="220" y="120" width="360" height="560" rx="24" fill="${body}"/>
    <rect x="240" y="140" width="320" height="250" rx="12" fill="${screen}"/>
    <rect x="240" y="410" width="320" height="250" rx="12" fill="${screen}"/>
    <rect x="510" y="200" width="16" height="120" rx="8" fill="${accent}"/>`,
  headphones: ({ body, screen, accent }) => `
    <path d="M220 470 V380 Q220 190 400 190 Q580 190 580 380 V470" fill="none" stroke="${body}" stroke-width="36" stroke-linecap="round"/>
    <rect x="170" y="400" width="120" height="200" rx="54" fill="${body}"/>
    <rect x="510" y="400" width="120" height="200" rx="54" fill="${body}"/>
    <rect x="200" y="440" width="60" height="120" rx="30" fill="${accent}" opacity="0.7"/>
    <rect x="540" y="440" width="60" height="120" rx="30" fill="${accent}" opacity="0.7"/>
    <rect x="300" y="200" width="200" height="16" rx="8" fill="${screen}"/>`,
  earbuds: ({ body, screen, accent }) => `
    <rect x="240" y="360" width="320" height="230" rx="110" fill="${body}"/>
    <rect x="240" y="450" width="320" height="8" fill="${screen}"/>
    <circle cx="400" cy="520" r="10" fill="${accent}"/>
    <circle cx="330" cy="240" r="58" fill="${screen}"/><rect x="315" y="250" width="30" height="110" rx="15" fill="${screen}"/>
    <circle cx="470" cy="240" r="58" fill="${screen}"/><rect x="455" y="250" width="30" height="110" rx="15" fill="${screen}"/>`,
  speaker: ({ body, screen, accent }) => `
    ${[160, 440].map((x) => `
    <rect x="${x}" y="190" width="200" height="420" rx="24" fill="${body}"/>
    <circle cx="${x + 100}" cy="300" r="46" fill="${screen}"/>
    <circle cx="${x + 100}" cy="470" r="76" fill="${screen}"/><circle cx="${x + 100}" cy="470" r="26" fill="${accent}"/>`).join("")}`,
  tv: ({ body, screen, accent }) => `
    <rect x="100" y="190" width="600" height="360" rx="18" fill="${body}"/>
    <rect x="116" y="206" width="568" height="328" rx="8" fill="${screen}"/>
    <path d="M260 470 Q400 300 540 470 Z" fill="${accent}" opacity="0.6"/>
    <rect x="300" y="560" width="200" height="16" rx="8" fill="${body}"/>`,
  watch: ({ body, screen, accent }) => `
    <rect x="320" y="110" width="160" height="580" rx="60" fill="${screen}" opacity="0.7"/>
    <rect x="270" y="260" width="260" height="290" rx="70" fill="${body}"/>
    <rect x="292" y="282" width="216" height="246" rx="54" fill="${screen}"/>
    <path d="M330 420 H370 L390 370 L415 460 L435 410 H470" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,
  tracker: ({ body, screen, accent }) => `
    ${[[300, 320], [500, 320], [300, 520], [500, 520]].map(([x, y]) => `
    <circle cx="${x}" cy="${y}" r="88" fill="${body}"/><circle cx="${x}" cy="${y}" r="58" fill="${screen}"/>
    <circle cx="${x}" cy="${y}" r="14" fill="${accent}"/>`).join("")}`,
  camera: ({ body, screen, accent }) => `
    <rect x="150" y="270" width="500" height="320" rx="36" fill="${body}"/>
    <rect x="330" y="220" width="150" height="70" rx="16" fill="${body}"/>
    <circle cx="420" cy="430" r="120" fill="${screen}"/><circle cx="420" cy="430" r="70" fill="${accent}" opacity="0.7"/>
    <rect x="190" y="300" width="70" height="30" rx="10" fill="${screen}"/>`,
  "action-camera": ({ body, screen, accent }) => `
    <rect x="240" y="250" width="320" height="300" rx="40" fill="${body}"/>
    <circle cx="400" cy="400" r="96" fill="${screen}"/><circle cx="400" cy="400" r="50" fill="${accent}" opacity="0.7"/>
    <rect x="270" y="275" width="70" height="26" rx="8" fill="${screen}"/>`,
};

/** A device drawn in the product's hue, so the demo ships no photos it does not own. */
export function placeholderImage(name, hue, shape) {
  const colors = {
    body: `hsl(${hue} 22% 24%)`,
    screen: `hsl(${hue} 45% 78%)`,
    accent: `hsl(${(hue + 40) % 360} 70% 55%)`,
  };
  const draw = DEVICES[shape] ?? DEVICES.phone;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="hsl(${hue} 30% 93%)"/>
  <ellipse cx="400" cy="720" rx="260" ry="26" fill="hsl(${hue} 20% 82%)"/>${draw(colors)}
</svg>`;
}

/** The shape to draw for an image file of the catalog (`<slug>-<n>.svg`, `review-<slug>-<n>.svg`). */
export function shapeOfImage(file) {
  const slug = file.replace(/\.svg$/, "").replace(/-\d+$/, "").replace(/^review-/, "");
  return products.find((product) => product.slug === slug)?.shape ?? null;
}
