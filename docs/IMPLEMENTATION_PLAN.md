# Implementation plan

How this starter is built, phase by phase. Each phase ends in one or more commits, leaves the
project building, and has an exit check. The plan doubles as the reading order for a new developer:
later phases only depend on earlier ones.

## Goals

- A demonstrative Next.js storefront that a developer can clone and run in minutes, with or without
  a WordPress site.
- Headpress is the backend engine. Every Headpress and Store API call goes through the
  `@meumouse.com/headpress` SDK.
- The supported plugins have one clearly bounded integration each, so a project can remove one by
  deleting a folder and a registry line:

  | Plugin | Role | Integration folder |
  | --- | --- | --- |
  | Headpress | Engine: config, routes, SEO, accounts, cart extensions | `src/lib/headpress` |
  | Parcelas Customizadas (`wc-custom-installments`) | Installments and upfront prices | `src/integrations/installments` |
  | HubGo / Envora (`envora/v1`, `hubgo/v1`) | Shipping quotes and delivery estimates | `src/integrations/shipping` |
  | Cielo Store API (`wc-cielo/v1`) | Credit, debit and Pix | `src/integrations/cielo` |
  | PayPal Store API (`paypal-store-api/v1`) | Wallet, card and Pix | `src/integrations/paypal` |
  | Sellback (`sellback/v1`) | Abandoned cart recovery | `src/integrations/sellback` |

- A design system of its own, built on design tokens. The reference storefront informs the
  structure and the integration logic, never the look.
- Everything in English: code, comments, docs and commits. The README also ships in pt-BR and
  Spanish, and the interface text ships in `en`, `pt-BR` and `es`.

## Non-goals

These are out of the first version on purpose. See [Phase 9](#phase-9--after-the-starter).

- Store-specific features of the reference project (ring personalization, graduation courses,
  Instagram and Google review feeds, the Redis catalog cache).
- Split payments and payment links (the SDK supports them; the UI is a project decision).

## Architecture decisions

| Decision | Why |
| --- | --- |
| Feature folders (`src/features/*`) over the reference's `views` + `lib` split | Everything about a domain lives together, and a feature can be read or removed on its own. |
| Integrations (`src/integrations/*`) separate from features | A feature depends on an interface (`PaymentProvider`, a shipping quote), not on a gateway. Gateway knowledge stays in one folder. |
| Server Components for catalog and content, client islands for cart, checkout and account | Public pages stay cacheable and tagged for the Headpress webhook; personal data never enters the Data Cache. |
| The SDK's React bindings first, TanStack Query only for what they do not cover | The SDK already shares the cart, session and search state. |
| The Next.js Data Cache through `nextCache()`, no Redis | One less service for a starter. Redis stays an option documented in `docs/ARCHITECTURE.md`. |
| A mock WordPress as a separate process (`mock-server/`) | The storefront has no demo branches: it speaks the same HTTP contract to the mock and to a real store, and the mock never reaches the production bundle. |
| Interface text in static dictionaries, one locale per deployment | A store usually sells in one language. No routing or runtime cost, and the type system keeps the three dictionaries in step. |
| English route paths matching the Headpress and Sellback defaults | `/product/{slug}`, `/cart/recover/{token}` and `/unsubscribe/{token}` need no change in WordPress. |

## Phases

### Phase 0 — Foundation

Tooling and project rules.

- Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS 4, ESLint, Vitest.
- `AGENTS.md` with the conventions, `.env.example`, `.gitignore`, `Dockerfile`, standalone output.

**Exit check:** `npm run build`, `npm run lint` and `npm run typecheck` pass on an empty app.

### Phase 1 — Design system

- Tokens in `src/styles/tokens.css`: color, type, spacing, radius, shadow, motion.
- Primitives in `src/components/ui`: button, input, select, checkbox, radio, badge, alert, card,
  dialog, sheet, skeleton, pagination, and more.
- `docs/DESIGN_SYSTEM.md` explains the tokens and how to rebrand.

**Exit check:** primitives render from tokens only, with no hard-coded colors in features.

### Phase 2 — Headpress engine

- Client factories in `src/lib/headpress`: browser client (BFF session, cookie Cart-Token), server
  client (public reads through `nextCache()`), secret client (server routes only).
- Outage-safe reads: the store keeps opening when WordPress is down, and an outage is never a 404.
- `/api/auth/[...action]` (BFF), `/api/revalidate` (webhook), `src/proxy.ts` (SEO redirects),
  `sitemap.ts` and `robots.ts`.
- The route map in `src/config/routes.ts`, with `npm run check:routes` to compare it with WordPress.
- The i18n dictionaries.
- The mock WordPress, so the following phases can be run in a browser.

**Exit check:** the app reads the store config from the mock server and survives it being stopped.

### Phase 3 — Catalog and content

- Home, shop, category, tag and search listings with filters, sorting and pagination.
- Product page: gallery, variations, reviews, JSON-LD, related products.
- Blog and CMS pages through the Headpress `content` module.
- Search dialog with live suggestions.

**Exit check:** a visitor can browse from the home page to a variation of a product.

### Phase 4 — Cart, installments and shipping

- Cart drawer and cart page through the SDK cart controller: quantities, coupons, free-shipping
  progress.
- Parcelas Customizadas: upfront price and best installment on cards, the full table on the product
  page, the upfront total in the cart.
- HubGo / Envora: product shipping calculator with route probing, and delivery estimates on cart
  shipping rates.

**Exit check:** add to cart, change quantity, apply a coupon and quote shipping against the mock.

### Phase 5 — Checkout and payments

- One-page checkout: contact, Brazilian address with CEP lookup, shipping, payment, order summary.
- A `PaymentProvider` registry, so a gateway is one folder and one registry line.
- Cielo: Silent Order Post tokenization (the card never reaches WordPress), 3DS 2.0, credit and
  debit, installments, Pix with polling.
- PayPal: wallet and card buttons from the PayPal JS SDK, and Pix.
- Order received page with Pix instructions, status polling and purchase tracking.

**Exit check:** a demo order completes with each method the mock offers.

### Phase 6 — Customer accounts

- Sign in, sign up, password reset, through the httpOnly refresh-token BFF.
- Profile, order history and details, address book, wishlist.

**Exit check:** a demo customer signs in, keeps the session after a reload, and sees their orders.

### Phase 7 — Recovery, consent and analytics

- Sellback: contact capture at checkout, the recovery page, the recovery coupon banner and the
  message preferences page.
- Consent banner and analytics through the SDK (`modules.consent`, GA4, Meta Pixel, Pinterest).

**Exit check:** a recovery link restores a cart, and no tag loads before consent.

### Phase 8 — Quality and documentation

- Unit tests for integration adapters, against the SDK's `mockHeadpress`.
- `README` in English, pt-BR and Spanish; `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`,
  `docs/WORDPRESS_SETUP.md`.
- Browser pass over the main flows at desktop and mobile widths.

**Exit check:** `npm run verify` (lint, types, tests, build) passes, and the main flows work
in a browser against the mock server.

### Phase 9 — After the starter

Backlog for a project built on this starter. None of it blocks a first release.

- Passwordless sign-in (`useOtpFlow`), Google sign-in, saved payment methods.
- Renewing an expired Cielo Pix (`actions.renew`), and retrying a failed payment.
- Split payments (`useSplitBuilder`) and the `order_pay` payment link route.
- Review form (`useReviewForm`) and `product_review` route.
- Banners module, order tracking page.
- Redis server cache with `swr()` and `redisCache()` from the SDK.
- End-to-end tests with Playwright against the mock server, in CI.
- Validation on one WordPress with all six plugins together (see the checklist in
  `docs/WORDPRESS_SETUP.md`). Headpress, WooCommerce and HubGo are validated live; see
  `docs/STORE_API.md`.
- The Store API gaps listed in `docs/STORE_API.md`.
