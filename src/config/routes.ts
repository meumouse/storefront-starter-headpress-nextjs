/**
 * Where each kind of content lives on this storefront, in the vocabulary of the Headpress route map
 * (`routes` in `GET /headpress/v1/store/config`).
 *
 * Headpress builds every link WordPress hands out (emails, sitemaps, search results, recovery
 * links) from its own copy of this map. Next.js routes are files, so the two only agree if they are
 * kept equal: `npm run check:routes` compares them.
 *
 * No imports here: `scripts/check-routes.mjs` loads this file with Node's own TypeScript support.
 */

/** Route key → path pattern, exactly as Headpress must publish it. */
export const STOREFRONT_ROUTES = {
  home: "/",
  blog: "/blog",
  post: "/blog/{slug}",
  page: "/{path}",
  shop: "/shop",
  product: "/product/{slug}",
  product_cat: "/category/{slug}",
  product_tag: "/tag/{slug}",
  cart: "/cart",
  checkout: "/checkout",
  order_received: "/checkout/order-received?order_id={order_id}&key={order_key}",
  account: "/account",
  account_order: "/account/orders/{order_id}",
  password_reset: "/account/reset-password?key={key}&login={login}",
  sellback_recovery: "/cart/recover/{token}",
  sellback_unsubscribe: "/unsubscribe/{token}",
} as const;

/** Route keys without a page yet. List them under Headpress → Storefront → Routes without a page. */
export const UNROUTED_KEYS = ["category", "post_tag", "order_pay", "product_review"] as const;

export const paths = {
  home: "/",
  shop: "/shop",
  search: "/search",
  blog: "/blog",
  cart: "/cart",
  checkout: "/checkout",
  account: "/account",
  login: "/account/login",
  register: "/account/register",
  forgotPassword: "/account/forgot-password",
  orders: "/account/orders",
  addresses: "/account/addresses",
  wishlist: "/account/wishlist",
  profile: "/account/profile",
  product: (slug: string) => `/product/${slug}`,
  category: (slug: string) => `/category/${slug}`,
  tag: (slug: string) => `/tag/${slug}`,
  post: (slug: string) => `/blog/${slug}`,
  order: (id: number | string) => `/account/orders/${id}`,
  orderReceived: (orderId: number | string, key: string) =>
    `/checkout/order-received?order_id=${orderId}&key=${encodeURIComponent(key)}`,
} as const;
