# Headpress Storefront Starter

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

A Next.js storefront starter for WooCommerce, powered by the
[Headpress](https://meumouse.com) headless commerce engine. Clone it, run one command, and you have a
working store to build on, with or without a WordPress site.

## Quick start

```bash
npm install
```

```bash
npm run demo
```

Then open [http://localhost:3000](http://localhost:3000). `npm run demo` starts a mock WordPress and
the storefront, with no configuration. If port 3000 is taken, Next.js prints the one it picked.

| Try this | How |
| --- | --- |
| Sign in | `demo@example.com` / `demo-password` |
| Coupon | `WELCOME10`, or `FREE100` for an order with no payment step |
| Postcode | Any valid CEP, such as `01310-100` |
| CPF and date of birth | `529.982.247-25`, any past date |
| Card | `4111 1111 1111 1111`, any future date, any CVV |
| Pix | Choose Pix: the demo order counts as paid after 45 seconds |
| Split payment | At checkout, choose **Split payment**: part Pix, the rest by card |
| Sign in with a code | Code `123456` for `demo@example.com` or `11 99999-8888`; a WhatsApp number ending in `0000` shows the fallback to email |
| Review with photos | Sign in, open a product and write a review with a photo or video |
| Tracking | Open a paid order: a tracking code appears a minute after the payment |
| Emails | Open `/api/emails/preview` |
| Cart recovery | Open `/cart/recover/demo-token` |
| Message preferences | Open `/unsubscribe/demo-token` |

## What is included

- **Catalog:** home, shop, categories, tags, search with live suggestions, filters and pagination in
  the URL, product pages with variations, reviews and JSON-LD.
- **Cart:** drawer and page, coupons, free-shipping progress, shipping by postcode.
- **Checkout:** one page, Brazilian address with CEP lookup, shipping, payment, order confirmation.
- **Accounts:** sign-in with a password, a one-time code by email or WhatsApp, or Google, through an
  httpOnly refresh token; orders with delivery tracking, address book, wishlist, profile.
- **Reviews:** summary with per-star filters, customers' photos and videos, helpful votes, and a
  review form with uploads.
- **Recommendations:** bought together and related products, cart suggestions, best sellers.
- **Split payment:** one order paid in parts, such as Pix and card, priced by the server.
- **Emails:** every WordPress and WooCommerce email rendered in the store's look and sent from the
  storefront.
- **Content:** blog and pages published from WordPress.
- **SEO and consent:** head tags and redirects from WordPress, sitemap, consent banner, analytics.
- **Resilience:** the store keeps opening when WordPress is down, and an outage is never a 404.
- **Languages:** interface text in English, Portuguese and Spanish.

## Supported plugins

| Plugin | What it adds | Folder |
| --- | --- | --- |
| Headpress | Config, routes, accounts, SEO, revalidation | `src/lib/headpress` |
| Parcelas Customizadas | Upfront prices and installments | `src/integrations/installments` |
| HubGo / Envora | Shipping quotes and delivery estimates | `src/integrations/shipping` |
| Cielo Store API | Credit, debit with 3DS, Pix | `src/integrations/cielo` |
| PayPal Store API | Wallet, card, Pix | `src/integrations/paypal` |
| Sellback | Abandoned cart recovery | `src/integrations/sellback` |

Every integration is optional, and each lives in one folder. See
[docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Connecting your store

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_WP_URL`, then follow [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md).

```bash
npm run dev
```

> Catalog, cart, shipping and a bank transfer order were validated against a live WordPress. Cielo,
> PayPal and Sellback were tested against the mock server. The setup guide has a checklist for your
> first connection, and [docs/STORE_API.md](docs/STORE_API.md) has the WooCommerce Store API matrix.

## Commands

| Command | What it does |
| --- | --- |
| `npm run demo` | Mock WordPress and `next dev` |
| `npm run dev` | `next dev` against `NEXT_PUBLIC_WP_URL` |
| `npm run mock` | The mock WordPress alone |
| `npm run build` | Production build |
| `npm run verify` | Lint, types, tests and build |
| `npm run test` | Unit tests |
| `npm run check:routes` | Compares the route map with WordPress |

## Making it yours

- **Look:** edit `src/styles/tokens.css`. See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- **Language:** set `NEXT_PUBLIC_STORE_LOCALE` to `en`, `pt-BR` or `es`.
- **Texts:** edit the files in `src/i18n`.
- **Payment methods:** add a provider. See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Documentation

| Document | Covers |
| --- | --- |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phases, decisions and backlog |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Structure, caching, sessions, payments |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | Each plugin, and adding or removing one |
| [docs/STORE_API.md](docs/STORE_API.md) | WooCommerce Store API compatibility and known gaps |
| [docs/EMAILS.md](docs/EMAILS.md) | Transactional emails: templates, providers, add-ons |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, primitives, rebranding |
| [docs/WORDPRESS_SETUP.md](docs/WORDPRESS_SETUP.md) | Connecting and deploying |
| [AGENTS.md](AGENTS.md) | Conventions for developers and coding agents |

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, Vitest and the
[`@meumouse.com/headpress`](https://www.npmjs.com/package/@meumouse.com/headpress) SDK.
