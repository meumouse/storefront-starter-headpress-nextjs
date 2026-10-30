/** In-memory carts, keyed by Cart-Token, answered in the Store API shape. */
import { randomUUID } from "node:crypto";

import { fixtures } from "@meumouse.com/headpress/testing";

import { findSellable, installmentPlans } from "./catalog.mjs";

const CURRENCY = fixtures.storeCart().totals;
export const FREE_SHIPPING_THRESHOLD = 29900;
const PIX_PERCENT = 5;

/** Coupons the demo accepts. `sellback-5` is the one recovery links apply. */
const COUPONS = { welcome10: 10, "sellback-5": 5 };

const carts = new Map();

export function createCart() {
  const token = `mock-cart-${randomUUID()}`;
  const cart = {
    token,
    items: [],
    coupons: [],
    shipping: {},
    billing: {},
    selectedRate: "pac",
    contact: false,
    restored: null,
  };
  carts.set(token, cart);
  return cart;
}

export function getCart(token) {
  return (token && carts.get(token)) || createCart();
}

export function deleteCart(cart) {
  carts.delete(cart.token);
}

/** Replace the contents with what a recovery link restores. */
export function fillCart(cart, baseUrl) {
  addItem(cart, { id: 101, quantity: 2 }, baseUrl);
  addItem(cart, { id: 105, quantity: 1 }, baseUrl);
}

export function addItem(cart, { id, quantity = 1 }, baseUrl) {
  const sellable = findSellable(id, baseUrl);
  if (!sellable) return { error: "woocommerce_rest_product_not_found" };
  if (!sellable.store.is_purchasable) return { error: "woocommerce_rest_product_not_purchasable" };

  const line = cart.items.find((item) => item.id === id);
  if (line) line.quantity += quantity;
  else cart.items.push({ key: randomUUID().slice(0, 12), id, quantity });
  return {};
}

export function applyCoupon(cart, code) {
  const normalized = code.trim().toLowerCase();
  if (!COUPONS[normalized]) return false;
  if (!cart.coupons.includes(normalized)) cart.coupons.push(normalized);
  return true;
}

/** Quote rates for a subtotal. Envora and the cart share this logic. */
export function shippingOptions(subtotal, postcode) {
  const digits = (postcode ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return [];
  const far = Number(digits[0]) >= 6;
  const options = [
    { id: "pac", label: "PAC", cost: far ? 3290 : 2190, days: far ? 9 : 6 },
    { id: "sedex", label: "SEDEX", cost: far ? 5890 : 3990, days: far ? 4 : 2 },
  ];
  if (subtotal >= FREE_SHIPPING_THRESHOLD) options.unshift({ id: "free", label: "Free shipping", cost: 0, days: far ? 10 : 7 });
  return options;
}

export function deliveryEstimate(days) {
  return {
    days,
    date: "",
    date_label: "",
    timestamp: 0,
    label: `${days} business days`,
    headline: `Arrives in up to ${days} business days`,
  };
}

function lineFor(item, baseUrl) {
  const { store } = findSellable(item.id, baseUrl);
  const unit = Number(store.prices.price);
  const total = unit * item.quantity;
  return {
    ...fixtures.storeCartItem({
      key: item.key,
      id: item.id,
      type: store.type,
      quantity: item.quantity,
      name: store.variation ? store.name : store.name,
      sku: store.sku,
      permalink: `http://localhost:3000/product/${store.slug}`,
      images: store.images.slice(0, 1),
      variation: store.variation
        ? store.variation.split(", ").map((entry) => {
            const [attribute, value] = entry.split(": ");
            return { attribute, value };
          })
        : [],
      prices: store.prices,
      totals: {
        ...CURRENCY,
        line_subtotal: String(total),
        line_subtotal_tax: "0",
        line_total: String(total),
        line_total_tax: "0",
      },
    }),
  };
}

function discountOf(subtotal, cart) {
  return cart.coupons.reduce((sum, code) => sum + Math.round((subtotal * COUPONS[code]) / 100), 0);
}

export function cartTotals(cart, baseUrl) {
  const subtotal = cart.items.reduce((sum, item) => {
    const { store } = findSellable(item.id, baseUrl);
    return sum + Number(store.prices.price) * item.quantity;
  }, 0);
  const options = shippingOptions(subtotal, cart.shipping.postcode);
  const selected = options.find((option) => option.id === cart.selectedRate) ?? options[0] ?? null;
  const discount = discountOf(subtotal, cart);
  return { subtotal, discount, options, selected, total: subtotal - discount + (selected?.cost ?? 0) };
}

export function toStoreCart(cart, baseUrl) {
  const { subtotal, discount, options, selected, total } = cartTotals(cart, baseUrl);
  const upfront = Math.round(total * (1 - PIX_PERCENT / 100));
  const best = installmentPlans(total).filter((plan) => !plan.has_interest).at(-1);
  const empty = fixtures.storeCart().shipping_address;

  const rates = options.map((option) => ({
    ...CURRENCY,
    rate_id: option.id,
    name: option.label,
    description: "",
    delivery_time: "",
    price: String(option.cost),
    taxes: "0",
    method_id: option.id === "free" ? "free_shipping" : "correios",
    instance_id: 1,
    meta_data: [],
    selected: option.id === selected?.id,
  }));

  return fixtures.storeCart({
    items: cart.items.map((item) => lineFor(item, baseUrl)),
    items_count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    coupons: cart.coupons.map((code) => ({
      code,
      discount_type: "percent",
      totals: { ...CURRENCY, total_discount: String(Math.round((subtotal * COUPONS[code]) / 100)), total_discount_tax: "0" },
    })),
    totals: {
      ...CURRENCY,
      total_items: String(subtotal),
      total_discount: String(discount),
      total_shipping: selected ? String(selected.cost) : null,
      total_shipping_tax: selected ? "0" : null,
      total_price: String(total),
    },
    shipping_address: { ...empty, ...cart.shipping },
    billing_address: { ...empty, email: "", ...cart.billing },
    needs_shipping: cart.items.length > 0,
    needs_payment: cart.items.length > 0,
    has_calculated_shipping: options.length > 0,
    shipping_rates:
      options.length > 0
        ? [
            {
              package_id: 0,
              name: "Shipment 1",
              destination: { ...empty, ...cart.shipping },
              items: cart.items.map((item) => ({ key: item.key, name: "", quantity: item.quantity })),
              shipping_rates: rates,
            },
          ]
        : [],
    extensions: {
      "wc-custom-installments": {
        discounts: { main: { total: String(upfront), discount: String(total - upfront), text_after: "with Pix" } },
        best_installments: {
          without_interest: best ? { count: best.count, amount: String(best.amount), total: String(best.total), has_interest: false } : null,
        },
        currency_code: "BRL",
        currency_minor_unit: 2,
      },
      headpress: {
        shipping: {
          free_shipping: {
            enabled: true,
            threshold: FREE_SHIPPING_THRESHOLD,
            subtotal,
            remaining: Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0),
            qualifies: subtotal >= FREE_SHIPPING_THRESHOLD,
            has_free_rate: options.some((option) => option.cost === 0),
          },
          packages: [
            {
              package_id: 0,
              rates: options.map((option) => ({ rate_id: option.id, delivery: deliveryEstimate(option.days) })),
            },
          ],
        },
        sellback: {
          tracked: true,
          has_contact: cart.contact,
          coupon: cart.coupons.includes("sellback-5") ? "SELLBACK-5" : null,
          restored: cart.restored,
        },
      },
    },
  });
}
