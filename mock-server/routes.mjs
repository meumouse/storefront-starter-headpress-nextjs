/** The mock's REST routes, grouped by the plugin that owns them on a real store. */
import { randomUUID } from "node:crypto";

import { fixtures, json, mockHeadpress, wpError } from "@meumouse.com/headpress/testing";

import { paymentMethods, SPLIT_METHODS, storeConfig } from "./data/config.mjs";
import { menus, pages, posts } from "./data/content.mjs";
import { products } from "./data/products.mjs";
import {
  addItem,
  applyCoupon,
  cartTotals,
  deleteCart,
  deliveryEstimate,
  fillCart,
  FREE_SHIPPING_THRESHOLD,
  getCart,
  shippingOptions,
  toStoreCart,
} from "./domain/cart.mjs";
import {
  allVariations,
  filterProducts,
  findProduct,
  findSellable,
  installmentPlans,
  placeholderImage,
  storeCategories,
  storeTags,
  toStoreProduct,
} from "./domain/catalog.mjs";
import { forContext, related } from "./domain/recommendations.mjs";
import {
  createReview,
  eligibility,
  listReviews,
  readUpload,
  reviewMedia,
  reviewSummary,
  storeUpload,
  vote,
  votedIds,
} from "./domain/reviews.mjs";

const DEMO_CUSTOMER = { login: "demo@example.com", password: "demo-password", phone: "5511999998888" };
/** Every one-time code of the demo. The mock prints it too, as a real store would send it. */
const DEMO_CODE = "123456";
/** Seconds after the payment until a demo order gets a tracking code. */
const SHIPPED_AFTER = 60;
/** A fake Pix code in the EMV format, so QR rendering works. */
const PIX_CODE = "00020126580014br.gov.bcb.pix0136mock-0000-0000-0000-000000000000520400005303986540510.005802BR5909KESTREL6009SAO PAULO62070503***6304ABCD";
/** Seconds until a demo Pix counts as paid. */
const PIX_PAID_AFTER = 45;

const orders = new Map();
const accessTokens = new Set();
const challenges = new Map();
const registrations = new Map();
/** Review uploads not yet attached to a review. */
const pendingUploads = new Map();
let nextOrderId = 1200;
let wishlist = [101];
let customer = {
  id: 7,
  email: DEMO_CUSTOMER.login,
  first_name: "Demo",
  last_name: "Customer",
  display_name: "Demo Customer",
  avatar_url: "",
  billing: { first_name: "Demo", last_name: "Customer", email: DEMO_CUSTOMER.login, phone: "11999998888", postcode: "01310100", address_1: "Av. Paulista", city: "Sao Paulo", state: "SP", country: "BR" },
  shipping: { first_name: "Demo", last_name: "Customer", postcode: "01310100", address_1: "Av. Paulista", city: "Sao Paulo", state: "SP", country: "BR" },
  phone: { number: DEMO_CUSTOMER.phone, verified: true, verified_at: "2026-09-01T12:00:00" },
  email_verified: true,
  google: { linked: false, email: null, linked_at: null },
};
let addresses = [
  {
    id: "addr_1",
    label: "Home",
    first_name: "Demo",
    last_name: "Customer",
    company: "",
    address_1: "Av. Paulista",
    address_2: "",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "Sao Paulo",
    state: "SP",
    postcode: "01310100",
    country: "BR",
    phone: "11999998888",
    document: "",
    is_default_shipping: true,
    is_default_billing: true,
    created_at: "2026-09-01T12:00:00",
    updated_at: "2026-09-01T12:00:00",
    last_used_at: null,
  },
];
let preferences = [
  { id: "email", label: "Email", recipient_type: "email", hint: "de***@example.com", subscribed: true, locked: false },
  { id: "whatsapp", label: "WhatsApp", recipient_type: "phone", hint: "*********8888", subscribed: true, locked: false },
];

/** Answer with a cart, carrying its token like the Store API does. */
function cartResponse(cart, baseUrl, status = 200) {
  return json(toStoreCart(cart, baseUrl), { status, headers: { "Cart-Token": cart.token } });
}

function isAuthorized(request) {
  return accessTokens.has(request.headers.get("Authorization")?.replace(/^Bearer\s+/i, ""));
}

function sessionBody(extra = {}) {
  const accessToken = `mock-access-${randomUUID()}`;
  accessTokens.add(accessToken);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: `mock-refresh-${randomUUID()}`,
    refresh_expires_in: 2_592_000,
    cart_token: null,
    customer,
    ...extra,
  };
}

function requireAuth(handler) {
  return (request, params) =>
    isAuthorized(request) ? handler(request, params) : wpError(401, "headpress_unauthorized", "Sign in first.");
}

const STATUS_LABELS = { pending: "Pending payment", partial_paid: "Partially paid", processing: "Processing" };

function orderSummary(order) {
  return {
    id: order.id,
    number: String(order.id),
    status: order.status,
    status_label: STATUS_LABELS[order.status] ?? order.status,
    date_created: order.createdAt,
    currency: "BRL",
    total: order.total,
    item_count: order.items.reduce((sum, item) => sum + item.quantity, 0),
    needs_payment: order.status === "pending" || order.status === "partial_paid",
    order_key: order.key,
  };
}

function orderDetail(order) {
  return {
    ...orderSummary(order),
    payment_method: order.paymentMethod,
    payment_method_title: order.paymentTitle,
    customer_note: "",
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: 0,
      fees: 0,
      total: order.total,
      refunded: 0,
    },
    shipping_lines: [{ method_id: "correios", title: order.shippingTitle, total: order.shipping }],
    billing: order.billing,
    shipping: order.shippingAddress,
    items: order.items,
    notes: [],
  };
}

function settlePix(order) {
  const age = (Date.now() - order.createdAtMs) / 1000;
  if (order.split) {
    for (const leg of order.split) {
      if (leg.kind === "pix" && leg.status === "pending" && age >= PIX_PAID_AFTER) {
        leg.status = "paid";
        leg.paidAt = new Date().toISOString();
      }
    }
    const paid = order.split.filter((leg) => leg.status === "paid").length;
    order.status = paid === order.split.length ? "processing" : paid > 0 ? "partial_paid" : "pending";
    if (order.status === "processing") order.paidAtMs ??= Date.now();
    return;
  }
  if (order.pix && order.status === "pending" && age >= PIX_PAID_AFTER) {
    order.status = "processing";
    order.paidAtMs = Date.now();
  }
}

/** A split plan checked like Headpress checks it, with each part's discount and charge. */
function planSplit(total, legs) {
  const fields = {};
  if (!Array.isArray(legs) || legs.length < 2 || legs.length > 3) fields.legs = "Use 2 to 3 payment methods.";
  const priced = (Array.isArray(legs) ? legs : []).map((leg, index) => {
    const gateway = leg.gateway ?? leg.gateway_id;
    const method = SPLIT_METHODS.find((entry) => entry.id === gateway);
    const amount = Number(leg.amount) || 0;
    if (!method) fields[`legs.${index}.gateway_id`] = "This method cannot pay a part.";
    if (amount < 100) fields[`legs.${index}.amount`] = "Each part must be at least R$ 1,00.";
    const discount = method?.discount ? Math.round((amount * method.discount.amount) / 100) : 0;
    return {
      gateway,
      kind: method?.kind ?? "other",
      title: method?.title ?? gateway,
      amount,
      discount,
      charge: amount - discount,
    };
  });
  const sum = priced.reduce((value, leg) => value + leg.amount, 0);
  if (!fields.legs && sum !== total) fields.legs = `The parts must add up to ${total}.`;
  return { fields, legs: priced, discountTotal: priced.reduce((value, leg) => value + leg.discount, 0) };
}

function paymentEntry(order, leg, index, baseUrl) {
  return {
    id: order.id * 10 + index,
    gateway_id: leg.gateway,
    title: leg.title,
    kind: leg.kind,
    amount: leg.charge,
    refunded_amount: 0,
    status: leg.status,
    source: "checkout",
    created_at: order.createdAt,
    paid_at: leg.paidAt ?? null,
    expires_at: leg.kind === "pix" ? order.expiresAt : null,
    payment_order: { id: order.id * 10 + index, key: `${order.key}_${index}` },
    payment_details:
      leg.kind === "pix" && leg.status === "pending"
        ? { cielo_pix_copy_paste: PIX_CODE, cielo_pix_qr_code_url: `${baseUrl}/mock/qr.svg`, cielo_expires_at: order.expiresAt }
        : {},
    redirect_url: "",
    pay_url: "",
  };
}

/** `GET /store/orders/{id}/payments`: the parts of a split order, or the order as its only part. */
function paymentSummary(order, baseUrl) {
  settlePix(order);
  const payments = order.split
    ? order.split.map((leg, index) => paymentEntry(order, leg, index, baseUrl))
    : [
        {
          id: 0,
          gateway_id: order.paymentMethod,
          title: order.paymentTitle,
          kind: order.pix ? "pix" : "card",
          amount: order.total,
          refunded_amount: 0,
          status: order.status === "pending" ? "pending" : "paid",
          source: "order",
          created_at: order.createdAt,
          paid_at: null,
          expires_at: null,
          payment_order: null,
          payment_details: {},
          redirect_url: "",
          pay_url: "",
        },
      ];
  const sumOf = (status) =>
    payments.filter((payment) => payment.status === status).reduce((sum, payment) => sum + payment.amount, 0);
  const paid = sumOf("paid");
  return {
    order_id: order.id,
    order_number: String(order.id),
    order_status: order.status,
    currency: "BRL",
    total: order.total,
    paid,
    refunded: 0,
    pending: sumOf("pending"),
    remaining: Math.max(order.total - paid, 0),
    state: paid >= order.total ? "paid" : paid > 0 ? "partial" : "unpaid",
    is_split: Boolean(order.split),
    needs_payment: Boolean(order.split) && paid < order.total,
    payments,
    methods: [],
  };
}

function orderTracking(order) {
  settlePix(order);
  const shippedAt = order.paidAtMs ? order.paidAtMs + SHIPPED_AFTER * 1000 : null;
  const code = `QB${String(order.id).padStart(9, "0")}BR`;
  const promised = new Date(order.createdAtMs + 6 * 86_400_000);
  return {
    order_id: order.id,
    status: order.status,
    items:
      shippedAt && Date.now() >= shippedAt
        ? [
            {
              tracking_number: code,
              provider: "correios",
              carrier_name: "Correios",
              provider_label: "Correios",
              tracking_link: `https://rastreamento.correios.com.br/app/index.php?objetos=${code}`,
              ship_date: new Date(shippedAt).toISOString().slice(0, 10),
              ship_date_label: new Date(shippedAt).toLocaleDateString("en-GB"),
              date_label: "",
            },
          ]
        : [],
    delivery_promise: {
      days: 6,
      date: promised.toISOString().slice(0, 10),
      date_label: promised.toLocaleDateString("en-GB"),
      carrier: "Correios",
      method: order.shippingTitle,
      overdue: false,
    },
  };
}

function challengeBody(challenge) {
  return {
    challenge_id: challenge.id,
    channel: challenge.channel,
    masked_recipient: challenge.masked,
    expires_in: 300,
    resend_in: challenge.resends >= 3 ? null : 30,
  };
}

function maskRecipient(channel, recipient) {
  if (channel !== "email") return `*********${recipient.slice(-4)}`;
  const [name, domain] = recipient.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function voterOf(request) {
  return isAuthorized(request) ? `customer-${customer.id}` : (request.headers.get("X-Headpress-Voter") ?? "anonymous");
}

/** The order's payment object of the Cielo plugin. */
function cieloPayment(order, baseUrl) {
  settlePix(order);
  const paid = order.status === "processing";
  return {
    order_id: order.id,
    order_number: String(order.id),
    order_status: order.status,
    method: order.pix ? "pix" : "credit",
    gateway: order.paymentMethod,
    status: paid ? "paid" : "awaiting_payment",
    is_paid: paid,
    amount: order.total,
    currency: "BRL",
    expires_at: order.expiresAt,
    pix: order.pix ? { copy_paste: PIX_CODE, qr_code_url: `${baseUrl}/mock/qr.svg` } : null,
    actions: { renew: false },
    message: null,
    poll_interval: paid ? 0 : 5,
  };
}

function paymentResult(order, method, baseUrl) {
  const details = [];
  const add = (key, value) => details.push({ key, value: String(value) });

  if (method === "cielo_pix") {
    add("cielo_method", "pix");
    add("cielo_status", "awaiting_payment");
    add("cielo_pix_copy_paste", PIX_CODE);
    add("cielo_pix_qr_code_url", `${baseUrl}/mock/qr.svg`);
    add("cielo_expires_at", order.expiresAt);
  } else if (method === "paypal_store_api_pix") {
    add("pix_code", PIX_CODE);
    add("pix_image", "");
    add("pix_expires_at", Math.floor(new Date(order.expiresAt).getTime() / 1000));
  } else if (method.startsWith("cielo_")) {
    add("cielo_method", "credit");
    add("cielo_status", "paid");
  }

  return {
    payment_status: order.pix || method === "bacs" ? "pending" : "success",
    payment_details: details,
    redirect_url: `http://localhost:3000/checkout/order-received?order_id=${order.id}&key=${order.key}`,
  };
}

export function createRoutes({ baseUrl }) {
  const server = mockHeadpress({
    // ----- Media and the stand-in for Cielo's script -----
    "GET /media/:file": (request, { file }) => {
      const hue = Number(new URL(request.url).searchParams.get("hue") ?? 200);
      return new Response(placeholderImage(file, hue), {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
      });
    },
    "GET /mock/silentorderpost.js": () =>
      new Response(
        `window.bpSop_silentOrderPost = function (options) {
           var number = document.querySelector(".bp-sop-cardnumber").value;
           setTimeout(function () {
             options.onSuccess({ PaymentToken: "mock-token", Brand: number.charAt(0) === "5" ? "Master" : "Visa", CardLast4Digits: number.slice(-4) });
           }, 300);
         };`,
        { headers: { "Content-Type": "text/javascript" } },
      ),
    "GET /mock/mpi.js": () =>
      new Response(
        `(function () {
           var config = window.bpmpi_config();
           window.bpmpi_authenticate = function () {
             setTimeout(function () {
               config.onSuccess({ Cavv: "mock", Xid: "mock", Eci: "05", Version: "2", ReferenceId: "mock" });
             }, 400);
           };
           config.onReady();
         })();`,
        { headers: { "Content-Type": "text/javascript" } },
      ),
    "GET /mock/qr.svg": () =>
      new Response(placeholderImage("qr", 0), { headers: { "Content-Type": "image/svg+xml" } }),

    // ----- Headpress: store config -----
    "GET /wp-json/headpress/v1/store/config": () =>
      json(storeConfig(baseUrl), { headers: { ETag: '"mock00000001"', "Cache-Control": "public, max-age=60" } }),
    "GET /wp-json/headpress/v1/store/checkout/payment-methods": () => json(paymentMethods(baseUrl)),

    // ----- WooCommerce Store API: catalog -----
    "GET /wp-json/wc/store/v1/products": (request) => {
      const params = new URL(request.url).searchParams;
      if (params.get("type") === "variation") {
        const parent = findProduct(params.get("parent[0]"));
        return json(parent?.options ? allVariations(parent, baseUrl) : []);
      }
      const found = filterProducts(params);
      const perPage = Number(params.get("per_page") ?? 10);
      const page = Number(params.get("page") ?? 1);
      const items = found.slice((page - 1) * perPage, page * perPage);
      return json(
        items.map((product) => toStoreProduct(product, baseUrl)),
        { headers: { "X-WP-Total": String(found.length), "X-WP-TotalPages": String(Math.ceil(found.length / perPage)) } },
      );
    },
    "GET /wp-json/wc/store/v1/products/categories": () => json(storeCategories(baseUrl)),
    "GET /wp-json/wc/store/v1/products/tags": () => json(storeTags()),
    "GET /wp-json/wc/store/v1/products/attributes": () =>
      json([
        { id: 1, name: "Color", taxonomy: "pa_color", type: "select", order: "menu_order", has_archives: false, count: 3 },
        { id: 2, name: "Size", taxonomy: "pa_size", type: "select", order: "menu_order", has_archives: false, count: 3 },
      ]),
    "GET /wp-json/wc/store/v1/products/attributes/:id/terms": (_request, { id }) =>
      json(
        (id === "1" ? ["Sand", "Moss", "Ink"] : ["S", "M", "L"]).map((name, index) => ({
          id: Number(id) * 100 + index,
          name,
          slug: name.toLowerCase(),
          count: 1,
          description: "",
        })),
      ),
    "GET /wp-json/wc/store/v1/products/collection-data": (request) => {
      const params = new URL(request.url).searchParams;
      const found = filterProducts(params);
      const amounts = found.map((product) => product.price);
      return json({
        price_range: amounts.length
          ? {
              ...fixtures.storeCart().totals,
              min_price: String(Math.min(...amounts)),
              max_price: String(Math.max(...amounts)),
            }
          : null,
        attribute_counts: null,
        rating_counts: null,
        stock_status_counts: null,
      });
    },
    "GET /wp-json/wc/store/v1/products/:id": (_request, { id }) => {
      const product = findProduct(id);
      if (product) return json(toStoreProduct(product, baseUrl));
      const variation = findSellable(Number(id), baseUrl);
      return variation
        ? json(variation.store)
        : wpError(404, "woocommerce_rest_product_invalid_id", "Invalid product ID.");
    },

    // ----- WooCommerce Store API: cart -----
    "GET /wp-json/wc/store/v1/cart": (request) =>
      cartResponse(getCart(request.headers.get("Cart-Token")), baseUrl),
    "POST /wp-json/wc/store/v1/cart/add-item": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const body = await request.json();
      // The demo's attributes are global: the Store API wants the taxonomy, not the label.
      if (body.variation?.some(({ attribute }) => !attribute.startsWith("pa_"))) {
        return wpError(400, "woocommerce_rest_invalid_variation_data", "Unknown variation attribute.");
      }
      const { error } = addItem(cart, body, baseUrl);
      if (error) return wpError(400, error, "This product cannot be purchased.");
      return cartResponse(cart, baseUrl, 201);
    },
    "POST /wp-json/wc/store/v1/cart/update-item": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const { key, quantity } = await request.json();
      const line = cart.items.find((item) => item.key === key);
      if (line) line.quantity = quantity;
      return cartResponse(cart, baseUrl);
    },
    "POST /wp-json/wc/store/v1/cart/remove-item": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const { key } = await request.json();
      cart.items = cart.items.filter((item) => item.key !== key);
      return cartResponse(cart, baseUrl);
    },
    "DELETE /wp-json/wc/store/v1/cart/items": (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      cart.items = [];
      return cartResponse(cart, baseUrl);
    },
    "POST /wp-json/wc/store/v1/cart/apply-coupon": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const { code } = await request.json();
      if (!applyCoupon(cart, code)) {
        return wpError(400, "woocommerce_rest_cart_coupon_error", `Coupon "${code}" does not exist.`);
      }
      return cartResponse(cart, baseUrl);
    },
    "POST /wp-json/wc/store/v1/cart/remove-coupon": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const { code } = await request.json();
      cart.coupons = cart.coupons.filter((entry) => entry !== code);
      return cartResponse(cart, baseUrl);
    },
    "POST /wp-json/wc/store/v1/cart/update-customer": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const body = await request.json();
      cart.shipping = { ...cart.shipping, ...body.shipping_address };
      cart.billing = { ...cart.billing, ...body.billing_address };
      return cartResponse(cart, baseUrl);
    },
    "POST /wp-json/wc/store/v1/cart/select-shipping-rate": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      cart.selectedRate = (await request.json()).rate_id;
      return cartResponse(cart, baseUrl);
    },

    // ----- Sellback: recovery -----
    "POST /wp-json/wc/store/v1/cart/extensions": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const { data } = await request.json();
      if (data?.action !== "sellback.restore") {
        return wpError(400, "headpress_unknown_action", "Unknown action.");
      }
      if (data.token === "invalid") return wpError(404, "sellback_invalid_link", "This link is no longer valid.");
      if (cart.items.length === 0) fillCart(cart, baseUrl);
      applyCoupon(cart, "sellback-5");
      cart.restored = { added: cart.items.length, skipped: [], payment_url: null };
      const response = cartResponse(cart, baseUrl);
      cart.restored = null;
      return response;
    },
    "POST /wp-json/headpress/v1/store/cart/abandonment": (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      cart.contact = true;
      return json({ captured: true }, { status: 202 });
    },
    "GET /wp-json/sellback/v1/store/preferences": () => json({ channels: preferences }),
    "PUT /wp-json/sellback/v1/store/preferences": async (request) => {
      const { channels } = await request.json();
      const unsubscribed = Object.keys(channels).filter((id) => channels[id] === false);
      const resubscribed = Object.keys(channels).filter((id) => channels[id] === true);
      preferences = preferences.map((channel) =>
        channel.id in channels ? { ...channel, subscribed: channels[channel.id] } : channel,
      );
      return json({ channels: preferences, unsubscribed, resubscribed });
    },

    // ----- WooCommerce Store API: checkout -----
    "POST /wp-json/wc/store/v1/checkout": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      const body = await request.json();
      if (cart.items.length === 0) return wpError(400, "woocommerce_rest_cart_empty", "Your cart is empty.");

      const birthdate = body.extensions?.headpress?.checkout_fields?.values?.billing_birthdate;
      if (!birthdate) {
        const message = "Date of birth is a required field.";
        return wpError(400, "headpress_checkout_field_invalid", message, { fields: { billing_birthdate: message } });
      }

      const totals = cartTotals(cart, baseUrl);
      const method = paymentMethods(baseUrl).find((entry) => entry.id === body.payment_method);
      const isSplit = method?.config.extension_key === "split_payments";
      const plan = isSplit ? planSplit(totals.total, body.extensions?.headpress?.split_payments?.legs) : null;
      if (plan && Object.keys(plan.fields).length > 0) {
        return wpError(422, "headpress_validation_failed", Object.values(plan.fields)[0], { fields: plan.fields });
      }
      // A free order has no payment to make, so it needs no method.
      if (!method && totals.total > 0) {
        return wpError(400, "woocommerce_rest_invalid_payment_method", "Choose a payment method.");
      }

      const id = nextOrderId++;
      const pix = method?.config.kind === "pix";
      const order = {
        id,
        key: `wc_order_${randomUUID().slice(0, 13)}`,
        status: isSplit ? "partial_paid" : pix || method?.id === "bacs" ? "pending" : "processing",
        // A card part is approved at once; a Pix part is paid after a while, like any demo Pix.
        split: plan?.legs.map((leg) => ({ ...leg, status: leg.kind === "pix" ? "pending" : "paid" })) ?? null,
        pix,
        paymentMethod: method?.id ?? "",
        paymentTitle: method?.title ?? "",
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        billing: body.billing_address,
        shippingAddress: body.shipping_address,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.selected?.cost ?? 0,
        shippingTitle: totals.selected?.label ?? "",
        total: totals.total - (plan?.discountTotal ?? 0),
        items: cart.items.map((item) => {
          const { store } = findSellable(item.id, baseUrl);
          const amount = Number(store.prices.price) * item.quantity;
          return {
            id: item.id,
            product_id: store.parent || store.id,
            variation_id: store.parent ? store.id : 0,
            name: store.variation ? `${store.name} (${store.variation})` : store.name,
            sku: store.sku,
            quantity: item.quantity,
            subtotal: amount,
            total: amount,
            image: store.images[0]?.src ?? null,
            url: `/product/${store.slug}`,
            meta: [],
          };
        }),
      };
      if (order.status === "processing") order.paidAtMs = Date.now();
      orders.set(id, order);
      deleteCart(cart);

      return json({
        order_id: id,
        status: order.status,
        order_key: order.key,
        customer_note: "",
        billing_address: body.billing_address,
        shipping_address: body.shipping_address,
        payment_method: order.paymentMethod,
        payment_result: isSplit
          ? {
              payment_status: "pending",
              payment_details: [],
              redirect_url: `http://localhost:3000/checkout/order-received?order_id=${order.id}&key=${order.key}`,
            }
          : paymentResult(order, order.paymentMethod, baseUrl),
        totals: { currency_code: "BRL" },
        extensions: order.split
          ? {
              headpress: {
                split_payments: {
                  legs: order.split.map((leg, index) => {
                    const entry = paymentEntry(order, leg, index, baseUrl);
                    return {
                      gateway_id: leg.gateway,
                      amount: leg.charge,
                      status: leg.status === "paid" ? "success" : "pending",
                      message: "",
                      redirect_url: "",
                      payment_details: entry.payment_details,
                      payment: entry,
                    };
                  }),
                },
              },
            }
          : {},
      });
    },
    "GET /wp-json/headpress/v1/store/orders/:id/analytics": (_request, { id }) => {
      const order = orders.get(Number(id));
      if (!order) return wpError(404, "headpress_not_found", "Not found.");
      return json({
        order_id: order.id,
        transaction_id: String(order.id),
        event_id: `purchase_${order.id}`,
        currency: "BRL",
        value: order.total / 100,
        tax: 0,
        shipping: order.shipping / 100,
        coupon: "",
        payment_method: order.paymentMethod,
        items: order.items.map((item) => ({
          item_id: String(item.id),
          item_name: item.name,
          price: item.total / item.quantity / 100,
          quantity: item.quantity,
        })),
      });
    },

    // ----- Cielo -----
    "POST /wp-json/wc-cielo/v1/store/sop/access-token": () =>
      json({
        access_token: "mock-sop-token",
        expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
        environment: "sandbox",
        script_url: `${baseUrl}/mock/silentorderpost.js`,
      }),
    "POST /wp-json/wc-cielo/v1/store/3ds/access-token": () =>
      json({
        access_token: "mock-3ds-token",
        expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
        environment: "SDB",
        script_url: `${baseUrl}/mock/mpi.js`,
        device_ip: "127.0.0.1",
      }),
    "GET /wp-json/wc-cielo/v1/store/installments": (request) => {
      const params = new URL(request.url).searchParams;
      const amount = Number(params.get("amount") ?? 0);
      return json({
        modality: "ByMerchant",
        brand: params.get("brand"),
        options: installmentPlans(amount).map((plan) => ({
          installments: plan.count,
          installment_amount: plan.amount,
          total: plan.total,
          interest: plan.total - amount,
          interest_free: !plan.has_interest,
          rate: plan.has_interest ? 1.99 : 0,
        })),
      });
    },
    "GET /wp-json/wc-cielo/v1/store/orders/:id/payment": (request, { id }) => {
      const order = orders.get(Number(id));
      const key = new URL(request.url).searchParams.get("key");
      if (!order || order.key !== key) return wpError(404, "wc_cielo_not_found", "Order not found.");
      return json(cieloPayment(order, baseUrl));
    },

    // ----- PayPal -----
    "POST /wp-json/paypal-store-api/v1/orders": () => json({ id: `MOCK-${randomUUID().slice(0, 8)}`, status: "CREATED" }),
    "POST /wp-json/paypal-store-api/v1/client-errors": () => json({ logged: true }),
    "GET /wp-json/paypal-store-api/v1/pix/:id": (request, { id }) => {
      const order = orders.get(Number(id));
      const key = new URL(request.url).searchParams.get("key");
      if (!order || order.key !== key) return wpError(404, "paypal_store_api_not_found", "Order not found.");
      settlePix(order);
      return json({ status: order.status === "processing" ? "paid" : "pending" });
    },

    // ----- Envora / HubGo -----
    "POST /wp-json/envora/v1/shipping/calculate": async (request) => {
      const form = new URLSearchParams(await request.text());
      const postcode = form.get("postcode") ?? "";
      if (postcode.replace(/\D/g, "").length !== 8) {
        return wpError(400, "envora_invalid_postcode", "Invalid postcode.");
      }
      const sellable = findSellable(Number(form.get("variation_id") || form.get("product")), baseUrl);
      const subtotal = (sellable ? Number(sellable.store.prices.price) : 0) * Number(form.get("qty") ?? 1);
      return json({
        status: "success",
        rates: shippingOptions(subtotal, postcode).map((option) => ({
          id: option.id,
          method_id: "correios",
          instance_id: 1,
          label: option.label,
          cost: option.cost / 100,
          cost_formatted: `R$ ${(option.cost / 100).toFixed(2)}`,
          is_free: option.cost === 0,
          delivery: deliveryEstimate(option.days),
          meta: {},
        })),
        free_shipping: {
          enabled: true,
          threshold: FREE_SHIPPING_THRESHOLD / 100,
          threshold_formatted: "",
          subtotal: subtotal / 100,
          subtotal_formatted: "",
          remaining: Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0) / 100,
          remaining_formatted: "",
          qualifies: subtotal >= FREE_SHIPPING_THRESHOLD,
          has_free_rate: subtotal >= FREE_SHIPPING_THRESHOLD,
        },
        context: { postcode, formatted_postcode: postcode, state: "", country: "BR", currency: "BRL", preferred_id: "" },
      });
    },

    // ----- Headpress: installments, search, reviews, content -----
    "GET /wp-json/headpress/v1/store/installments/simulate": (request) => {
      const params = new URL(request.url).searchParams;
      const product = findProduct(params.get("product_id"));
      const plans = installmentPlans(Number(params.get("price") ?? product?.price ?? 0));
      return json({ installments: plans, best_without_interest: plans.filter((plan) => !plan.has_interest).at(-1) ?? null });
    },
    "GET /wp-json/headpress/v1/store/search/suggest": (request) => {
      const query = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
      const found = products.filter((product) => product.name.toLowerCase().includes(query)).slice(0, 6);
      return json({
        query: { q: query, normalized: query },
        suggestion: null,
        redirect: null,
        total: found.length,
        partial: false,
        groups: [
          {
            type: "products",
            total: found.length,
            items: found.map((product) => {
              const store = toStoreProduct(product, baseUrl);
              const start = product.name.toLowerCase().indexOf(query);
              return {
                id: product.id,
                type: "product",
                parent_id: 0,
                name: product.name,
                slug: product.slug,
                path: `/product/${product.slug}`,
                sku: store.sku,
                image: { src: store.images[0].src, srcset: "", alt: product.name },
                prices: { ...store.prices, price_preview: null },
                on_sale: store.on_sale,
                in_stock: store.is_in_stock,
                rating: product.rating,
                highlight: { name: start >= 0 ? [[start, start + query.length]] : [] },
              };
            }),
          },
        ],
      });
    },
    "POST /wp-json/headpress/v1/store/search/events": () => json({ recorded: 1 }, { status: 202 }),
    "GET /wp-json/headpress/v1/store/products/:id/reviews": (request, { id }) => {
      const page = listReviews(baseUrl, Number(id), new URL(request.url).searchParams);
      return json(page.items, {
        headers: { "X-WP-Total": String(page.total), "X-WP-TotalPages": String(Math.ceil(page.total / page.perPage)) },
      });
    },
    "GET /wp-json/headpress/v1/store/products/:id/reviews/summary": (_request, { id }) =>
      findProduct(id) ? json(reviewSummary(baseUrl, Number(id))) : wpError(404, "headpress_not_found", "Unknown product."),
    "GET /wp-json/headpress/v1/store/products/:id/reviews/media": (request, { id }) => {
      const params = new URL(request.url).searchParams;
      const media = reviewMedia(baseUrl, Number(id));
      const perPage = Number(params.get("per_page") ?? 20);
      return json(media.slice(0, perPage), {
        headers: { "X-WP-Total": String(media.length), "X-WP-TotalPages": String(Math.ceil(media.length / perPage)) },
      });
    },
    "GET /wp-json/headpress/v1/store/products/:id/reviews/eligibility": (request, { id }) =>
      json(eligibility(Number(id), isAuthorized(request) ? customer.id : null)),
    "GET /wp-json/headpress/v1/store/products/:id/reviews/votes": (request, { id }) =>
      json({ review_ids: votedIds(Number(id), voterOf(request)) }),
    "POST /wp-json/headpress/v1/store/products/:id/reviews": async (request, { id }) => {
      if (!isAuthorized(request)) return wpError(401, "headpress_review_login_required", "Sign in to review this product.");
      const check = eligibility(Number(id), customer.id);
      if (!check.can_review) return wpError(409, "headpress_review_already_exists", "You already reviewed this product.");
      const body = await request.json();
      const fields = {};
      if (!body.rating) fields.rating = "Choose a rating.";
      if ((body.content ?? "").trim().length < 10) fields.content = "Write at least 10 characters.";
      if (Object.keys(fields).length > 0) {
        return wpError(400, "headpress_validation_failed", Object.values(fields)[0], { fields });
      }
      const review = createReview(baseUrl, Number(id), customer, body, pendingUploads);
      for (const entry of body.media ?? []) pendingUploads.delete(entry.id);
      return json({ status: "approved", review }, { status: 201 });
    },
    "POST /wp-json/headpress/v1/store/reviews/media": async (request) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) return wpError(400, "headpress_invalid_param", "Send a file.");
      const upload = await storeUpload(baseUrl, file);
      // The review keeps the media without the upload's secret.
      const media = { ...upload };
      delete media.token;
      delete media.expires_at;
      pendingUploads.set(upload.id, media);
      return json(upload, { status: 201 });
    },
    "DELETE /wp-json/headpress/v1/store/reviews/media/:id": (_request, { id }) => {
      pendingUploads.delete(Number(id));
      return new Response(null, { status: 204 });
    },
    "POST /wp-json/headpress/v1/store/reviews/:id/helpful": (request, { id }) => {
      const result = vote(Number(id), voterOf(request), true);
      return result ? json(result) : wpError(404, "headpress_not_found", "Unknown review.");
    },
    "DELETE /wp-json/headpress/v1/store/reviews/:id/helpful": (request, { id }) => {
      const result = vote(Number(id), voterOf(request), false);
      return result ? json(result) : wpError(404, "headpress_not_found", "Unknown review.");
    },
    "GET /mock/uploads/:id": (_request, { id }) => {
      const upload = readUpload(id);
      return upload
        ? new Response(upload.bytes, { headers: { "Content-Type": upload.mime, "Cache-Control": "public, max-age=3600" } })
        : new Response("Not found", { status: 404 });
    },
    "GET /wp-json/headpress/v1/store/content": (request) => {
      const path = new URL(request.url).searchParams.get("path");
      const post = [...pages, ...posts].find((entry) => entry.path === path);
      if (!post) return wpError(404, "headpress_not_found", "Nothing published here.");
      return json({ kind: "post", post, cache_tags: [] });
    },
    "GET /wp-json/headpress/v1/store/menus/:location": (_request, { location }) =>
      menus[location] ? json(menus[location]) : wpError(404, "headpress_not_found", "No such menu."),
    "GET /wp-json/wp/v2/posts": () =>
      json(
        posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          date: post.date,
          title: { rendered: post.title },
          excerpt: { rendered: `<p>${post.excerpt}</p>` },
        })),
        { headers: { "X-WP-Total": String(posts.length), "X-WP-TotalPages": "1" } },
      ),

    // ----- Headpress: recommendations -----
    "GET /wp-json/headpress/v1/store/products/:id/related": (request, { id }) => {
      const params = new URL(request.url).searchParams;
      const product = findProduct(id);
      if (!product) return wpError(404, "headpress_not_found", "Unknown product.");
      const strategy = params.get("strategy") ?? "auto";
      return json({
        product_id: product.id,
        strategy,
        items: related(product.id, strategy, Number(params.get("limit") ?? 8)),
      });
    },
    "GET /wp-json/headpress/v1/store/recommendations": (request) => {
      const params = new URL(request.url).searchParams;
      const context = params.get("context");
      // Variations count as their parent, as on a real store.
      const productIds = (params.get("product_ids") ?? "")
        .split(",")
        .filter(Boolean)
        .map((value) => (Number(value) >= 1000 ? Math.floor(Number(value) / 100) : Number(value)));
      if (context !== "cart" && context !== "home") return wpError(400, "headpress_invalid_param", "Unknown context.");
      if (context === "cart" && productIds.length === 0) {
        return wpError(400, "headpress_invalid_param", "The cart context needs product_ids.");
      }
      return json({ context, product_ids: productIds, items: forContext(context, productIds, Number(params.get("limit") ?? 8)) });
    },

    // ----- Headpress: split payments -----
    "POST /wp-json/headpress/v1/store/split-payments/quote": async (request) => {
      const cart = getCart(request.headers.get("Cart-Token"));
      if (cart.items.length === 0) return wpError(422, "headpress_validation_failed", "The cart is empty.", { fields: { cart: "Empty." } });
      const { total } = cartTotals(cart, baseUrl);
      const plan = planSplit(total, (await request.json()).legs);
      if (Object.keys(plan.fields).length > 0) {
        return wpError(422, "headpress_validation_failed", Object.values(plan.fields)[0], { fields: plan.fields });
      }
      return json({
        currency: "BRL",
        total,
        legs: plan.legs.map(({ gateway, kind, amount, discount, charge }) => ({ gateway, kind, amount, discount, charge })),
        discount_total: plan.discountTotal,
        charge_total: total - plan.discountTotal,
        valid: true,
      });
    },
    "GET /wp-json/headpress/v1/store/orders/:id/payments": (request, { id }) => {
      const order = orders.get(Number(id));
      const key = new URL(request.url).searchParams.get("key");
      if (!order || (order.key !== key && !isAuthorized(request))) return wpError(404, "headpress_not_found", "Order not found.");
      return json(paymentSummary(order, baseUrl), { headers: { "Cache-Control": "no-store, private" } });
    },

    // ----- Headpress: shipping (HubGo tracking) -----
    "GET /wp-json/headpress/v1/store/orders/:id/tracking": (request, { id }) => {
      const order = orders.get(Number(id));
      const key = new URL(request.url).searchParams.get("key");
      if (!order || order.key !== key) return wpError(404, "headpress_not_found", "Order not found.");
      return json(orderTracking(order), { headers: { "Cache-Control": "no-store" } });
    },

    // ----- Headpress: accounts -----
    "POST /wp-json/headpress/v1/store/auth/login": async (request) => {
      const { login, password } = await request.json();
      if (login !== DEMO_CUSTOMER.login || password !== DEMO_CUSTOMER.password) {
        return wpError(401, "headpress_invalid_credentials", "Incorrect email or password.");
      }
      return json(sessionBody({ cart_token: request.headers.get("Cart-Token") }));
    },
    "POST /wp-json/headpress/v1/store/auth/otp/start": async (request) => {
      const { channel, recipient = "" } = await request.json();
      const value = channel === "email" ? recipient.trim().toLowerCase() : recipient.replace(/\D/g, "");
      if (channel === "email" ? !value.includes("@") : value.length < 10) {
        return wpError(400, "headpress_invalid_recipient", "Check the email or phone number.");
      }
      // A number ending in 0000 shows the WhatsApp outage path: Headpress names the fallback.
      if (channel === "whatsapp" && value.endsWith("0000")) {
        return wpError(424, "headpress_channel_unavailable", "WhatsApp is unavailable right now.", {
          fallback_channels: ["email"],
        });
      }
      const challenge = {
        id: randomUUID(),
        channel,
        recipient: channel === "whatsapp" && value.length <= 11 ? `55${value}` : value,
        masked: maskRecipient(channel, value),
        resends: 0,
        attempts: 5,
      };
      challenges.set(challenge.id, challenge);
      console.log(`[mock] one-time code for ${challenge.masked}: ${DEMO_CODE}`);
      return json(challengeBody(challenge));
    },
    "POST /wp-json/headpress/v1/store/auth/otp/resend": async (request) => {
      const challenge = challenges.get((await request.json()).challenge_id);
      if (!challenge) return wpError(404, "headpress_otp_not_found", "This code expired. Start over.");
      if (challenge.resends >= 3) return wpError(429, "headpress_otp_resend_limit", "No more codes for this attempt.");
      challenge.resends += 1;
      return json(challengeBody(challenge));
    },
    "POST /wp-json/headpress/v1/store/auth/otp/verify": async (request) => {
      const { challenge_id: challengeId, code } = await request.json();
      const challenge = challenges.get(challengeId);
      if (!challenge) return wpError(404, "headpress_otp_not_found", "This code expired. Start over.");
      if (code !== DEMO_CODE) {
        challenge.attempts -= 1;
        return challenge.attempts <= 0
          ? wpError(429, "headpress_otp_locked", "Too many wrong codes. Ask for a new one.")
          : wpError(400, "headpress_otp_invalid", "That code is not right.", { attempts_left: challenge.attempts });
      }
      challenges.delete(challengeId);
      const known = challenge.recipient === DEMO_CUSTOMER.login || challenge.recipient === DEMO_CUSTOMER.phone;
      if (known) {
        return json(sessionBody({ cart_token: request.headers.get("Cart-Token"), purpose: "login", grant: { expires_in: 600 } }));
      }
      const registrationToken = randomUUID();
      registrations.set(registrationToken, challenge);
      return json({ needs_registration: true, registration_token: registrationToken, expires_in: 900 });
    },
    "POST /wp-json/headpress/v1/store/auth/otp/register": async (request) => {
      const { registration_token: token, email, first_name = "", last_name = "" } = await request.json();
      const challenge = registrations.get(token);
      if (!challenge) return wpError(400, "headpress_registration_expired", "Start over to create the account.");
      registrations.delete(token);
      customer = {
        ...customer,
        email,
        first_name,
        last_name,
        display_name: `${first_name} ${last_name}`.trim() || email,
        phone: challenge.channel === "email" ? null : { number: challenge.recipient, verified: true, verified_at: new Date().toISOString() },
      };
      return json(sessionBody({ cart_token: request.headers.get("Cart-Token") }), { status: 201 });
    },
    "POST /wp-json/headpress/v1/store/auth/google": async (request) => {
      const { credential } = await request.json();
      if (!credential) return wpError(401, "headpress_google_invalid_token", "Google did not confirm the account.");
      customer = { ...customer, google: { linked: true, email: customer.email, linked_at: new Date().toISOString() } };
      return json(sessionBody({ cart_token: request.headers.get("Cart-Token") }));
    },
    "POST /wp-json/headpress/v1/store/customers/me/google": requireAuth(async () => {
      customer = { ...customer, google: { linked: true, email: customer.email, linked_at: new Date().toISOString() } };
      return json(customer.google);
    }),
    "DELETE /wp-json/headpress/v1/store/customers/me/google": requireAuth(() => {
      customer = { ...customer, google: { linked: false, email: null, linked_at: null } };
      return new Response(null, { status: 204 });
    }),
    "POST /wp-json/headpress/v1/store/auth/register": async (request) => {
      const { email, first_name = "", last_name = "" } = await request.json();
      customer = { ...customer, email, first_name, last_name, display_name: `${first_name} ${last_name}`.trim() };
      return json(sessionBody({ cart_token: request.headers.get("Cart-Token") }), { status: 201 });
    },
    "POST /wp-json/headpress/v1/store/auth/refresh": () => json(sessionBody()),
    "POST /wp-json/headpress/v1/store/auth/logout": () => new Response(null, { status: 204 }),
    "POST /wp-json/headpress/v1/store/auth/password-reset": () => json({ sent: true }, { status: 202 }),
    "POST /wp-json/headpress/v1/store/auth/password-reset/confirm": () => new Response(null, { status: 204 }),
    "GET /wp-json/headpress/v1/store/customers/me": requireAuth(() => json(customer)),
    "PUT /wp-json/headpress/v1/store/customers/me": requireAuth(async (request) => {
      customer = { ...customer, ...(await request.json()) };
      return json(customer);
    }),
    "GET /wp-json/headpress/v1/store/customers/me/orders": requireAuth(() => {
      const list = [...orders.values()].reverse();
      list.forEach(settlePix);
      return json(list.map(orderSummary), {
        headers: { "X-WP-Total": String(list.length), "X-WP-TotalPages": "1" },
      });
    }),
    "GET /wp-json/headpress/v1/store/customers/me/orders/:id": requireAuth((_request, { id }) => {
      const order = orders.get(Number(id));
      if (!order) return wpError(404, "headpress_not_found", "Order not found.");
      settlePix(order);
      return json(orderDetail(order));
    }),
    "GET /wp-json/headpress/v1/store/customers/me/addresses": requireAuth(() => json({ addresses })),
    "POST /wp-json/headpress/v1/store/customers/me/addresses": requireAuth(async (request) => {
      const address = {
        ...addresses[0],
        ...(await request.json()),
        id: `addr_${randomUUID().slice(0, 6)}`,
        is_default_shipping: false,
        is_default_billing: false,
      };
      addresses = [...addresses, address];
      return json({ address, addresses }, { status: 201 });
    }),
    "PATCH /wp-json/headpress/v1/store/customers/me/addresses/:id": requireAuth(async (request, { id }) => {
      const changes = await request.json();
      addresses = addresses.map((address) => (address.id === id ? { ...address, ...changes } : address));
      return json({ address: addresses.find((address) => address.id === id), addresses });
    }),
    "DELETE /wp-json/headpress/v1/store/customers/me/addresses/:id": requireAuth((_request, { id }) => {
      addresses = addresses.filter((address) => address.id !== id);
      return json({ addresses });
    }),
    "GET /wp-json/headpress/v1/store/customers/me/wishlist": requireAuth(() => json(wishlistBody(baseUrl))),
    "POST /wp-json/headpress/v1/store/customers/me/wishlist": requireAuth(async (request) => {
      const { product_id: productId } = await request.json();
      if (!wishlist.includes(productId)) wishlist = [...wishlist, productId];
      return json(wishlistBody(baseUrl));
    }),
    "DELETE /wp-json/headpress/v1/store/customers/me/wishlist/:id": requireAuth((_request, { id }) => {
      wishlist = wishlist.filter((entry) => entry !== Number(id));
      return json(wishlistBody(baseUrl));
    }),
  });

  return server;
}

function wishlistBody(baseUrl) {
  return {
    count: wishlist.length,
    ids: wishlist,
    products: wishlist.map((id) => {
      const product = findProduct(id);
      const store = toStoreProduct(product, baseUrl);
      return {
        id,
        name: product.name,
        slug: product.slug,
        type: store.type,
        url: `/product/${product.slug}`,
        image: store.images[0].src,
        prices: store.prices,
      };
    }),
  };
}
