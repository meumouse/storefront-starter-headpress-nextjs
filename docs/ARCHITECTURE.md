# Architecture

## Overview

```
Browser ──────────────► Next.js storefront ──────────► WordPress
  │  cart, session,         │ public reads through        Headpress (headpress/v1)
  │  payments               │ the SDK, tagged cache       WooCommerce Store API (wc/store/v1)
  │                         │ /api/auth (BFF)             Plugins (wc-cielo/v1, paypal-store-api/v1,
  └─────────────────────────┼──────────────────────────►   sellback/v1, envora/v1, hubgo/v1)
                            │
              WordPress ────┘ POST /api/revalidate (signed webhook)
```

The browser talks to WordPress directly for everything personal. The Next.js server makes public
reads and holds two things that must not reach the browser: the refresh token and the secret keys.

## Folders

| Folder | Holds | May import |
| --- | --- | --- |
| `src/app` | Routes: metadata, server reads, composition | Everything below |
| `src/features` | Domain modules | `integrations`, `components`, `lib`, `config`, `i18n` |
| `src/integrations` | One folder per WordPress plugin | `components`, `lib`, `config`, `i18n`, checkout payment types |
| `src/components/ui` | Design system primitives | `lib/utils` only |
| `src/components/layout` | Store shell | `features`, `ui`, `lib` |
| `src/lib` | Headpress clients, environment, utilities | `i18n` |
| `src/config` | Route map, site configuration | Nothing |
| `src/i18n` | Interface dictionaries | `lib/env` |

Route groups separate the shells: `(store)` has the header and footer, `(checkout)` a minimal header.
`(store)/account/(area)` is behind sign-in; `(store)/account/(auth)` holds the sign-in forms.

## Headpress clients

| Client | File | Used for |
| --- | --- | --- |
| Browser | `lib/headpress/browser.ts` | Cart, checkout, account. Session through the BFF, Cart-Token in a cookie. |
| Server | `lib/headpress/server.ts` | Public reads only. Shared across requests, so it holds no session. |

Server code reads through `safeRead()` and `readOr()` (`lib/headpress/safe-read.ts`).

## Rendering and caching

- Catalog and content pages are Server Components. Pages with no parameters are prerendered and
  regenerated every 5 minutes (`revalidate` in the root layout). Pages with a slug or a query string
  render on request from the cached reads below.
- `nextCache()` tags each public fetch with the Headpress vocabulary (`product:12`, `product:list`,
  `headpress:config`) and keeps it for 5 minutes. When something changes, Headpress calls
  `/api/revalidate`, which verifies the signature and expires those tags at once.
- Anything with a customer token or a Cart-Token skips the Data Cache. Cart, checkout and account are
  client components, so a shopper's data can never land in a shared page.
- When WordPress is down, the Next.js Data Cache keeps serving what it has. A page with nothing
  cached renders the unavailable state, never a 404.

**Trade-off.** The Data Cache is cleared on each deploy. If a deploy happens during a WordPress
outage, pages have nothing to fall back on. The reference storefront solves this with Redis; the SDK
has `swr()` and `redisCache()` for it, listed in the plan's Phase 9.

## Sessions

`bffSession()` keeps the access token in memory, and `createAuthHandler()` keeps the refresh token in
an httpOnly cookie on the storefront's domain. A non-secret marker cookie (`hp_session`) tells the
browser a session is worth restoring. Refresh tokens rotate; the SDK serializes renewals across tabs.

The cart is identified by a Cart-Token in the first-party `hp_cart` cookie. Signing in merges the
guest cart into the customer's.

## Payments

```
CheckoutForm ──► PaymentSection ──► providerFor(method) ──► provider.Form
     │                                   registry.ts              │
     │ submit()                                                   │ register({ submit })
     ▼                                                            ▼
 validate() ──► handle.submit() ──► payment_data ──► hp.checkout.place()
```

- The server decides which methods exist. The registry maps each one to a provider.
- A provider's form hands back `payment_data` when asked. A provider with `submitsItself` (PayPal)
  draws its own button and calls `placeOrder()` itself.
- `selectableMethods()` hides what the shopper cannot pick: gateways the Store API excludes from this
  cart, the split gateway, and card or wallet methods with no provider.
- After placing the order, `pendingPayment()` says what the shopper still has to do (Pix, bank slip)
  and `pollStatus()` follows it on the order-received page.

See [INTEGRATIONS.md](INTEGRATIONS.md) for each plugin.

## Internationalization

`src/i18n` has one file per domain, with all three languages side by side. `defineMessages()` takes
its shape from English, so a missing translation is a type error. `NEXT_PUBLIC_STORE_LOCALE` picks
the language at build time, and the SDK's error dictionary follows it. All three languages ship in
the bundle: a store that wants them gone can delete the other two from each file.

## Mock WordPress

`mock-server/` is a separate Node process answering the same HTTP contract as a real store, built on
the SDK's `mockHeadpress`. The storefront has no demo branches, so what runs against the mock is what
runs in production. It keeps state in memory and restarts empty.

It stands in for Cielo's two scripts, so demo card numbers go through the same code path. PayPal
loads the real JS SDK with the public sandbox client id `sb`: the buttons render, but approving a
payment needs a real sandbox account and a real backend.
