# AGENTS.md

Guidelines for coding agents and developers working on this repository.

## Rules that are not negotiable

- **Everything in the repository is written in English:** identifiers, comments, docs and commit
  messages. Interface text lives in `src/i18n/messages/`, one dictionary per language; the exception
  to the English rule is `README.pt-BR.md`, `README.es.md` and those dictionaries.
- **No attribution or co-author lines** in commits, pull requests or generated files.
- **The server decides, the storefront shows.** Prices, discounts, installments, shipping and
  eligibility come from Headpress or the plugins. Never compute `price * 0.9` or `price / 12`.
- **Card numbers never reach our server or WordPress.** Cielo cards go through the Silent Order Post
  in the browser, and PayPal cards stay in PayPal's iframes.

## Commands

| Command | What it does |
| --- | --- |
| `npm run demo` | Mock WordPress plus `next dev`. No configuration needed. |
| `npm run dev` | `next dev` against `NEXT_PUBLIC_WP_URL`. |
| `npm run verify` | Lint, types, tests and production build. Run it before calling work done. |
| `npm run check:routes` | Compares `src/config/routes.ts` with the route map Headpress publishes. |

## Structure

```
src/app           Routes only: metadata, server data loading, composition.
src/components    ui/ is the design system; layout/ is the store shell.
src/features      Domain modules (catalog, cart, checkout, account, search, content, analytics).
src/integrations  One folder per WordPress plugin. Nothing outside knows a gateway's details.
src/lib           Headpress clients, environment, small utilities.
src/config        Route map and site configuration.
src/i18n          Interface dictionaries (en, pt-BR, es).
src/styles        Design tokens and global CSS.
mock-server       A fake WordPress for demos and development. Never imported by src/.
```

Import direction: `app` → `features` → `integrations` → `lib`. `components/ui` imports only `lib`.
Features may use each other's components, without cycles. Integrations may import the payment types
of `src/features/checkout/payments/types.ts` and nothing else from `features`. The payment registry
(`src/features/checkout/payments/registry.ts`) is the one place that names the gateways.

## Conventions

- 2 spaces, double quotes, semicolons, trailing commas. Imports through the `@/` alias.
- Components in PascalCase files, hooks as `useX.ts`, everything else in kebab-case.
- Comments explain why, not what, and only where the code cannot say it.
- Server Components by default. Add `"use client"` at the smallest boundary that needs it.
- Colors, radii and shadows come from the tokens in `src/styles/tokens.css`. No hex values or
  Tailwind palette colors in components.
- All visible text comes from `@/i18n`. Add a key to all three dictionaries; the types enforce it.
- Public environment variables are read through `src/lib/env.ts`, server ones through
  `src/lib/env.server.ts`. A new `NEXT_PUBLIC_*` also needs an `ARG` in the `Dockerfile`.

## Talking to WordPress

- Every call goes through the SDK: `hp.catalog`, `hp.cart`, `hp.checkout`, or `hp.request()` with
  `api: "<namespace>"` for plugin routes. No hand-built `fetch`.
- Failures are `HeadpressError`. Show them with `hp.formatError(error)`.
- The store must open with WordPress down. Server reads go through `safeRead()`
  (`src/lib/headpress/safe-read.ts`): "does not exist" is a 404, "did not answer" is the
  unavailable state, never a 404.
- Personal data stays out of the Data Cache: public reads only on the server, cart and customer
  data in the browser.

## Adding a payment method

See `docs/INTEGRATIONS.md`. In short: create the provider under `src/integrations/<gateway>`, then
add one line to `src/features/checkout/payments/registry.ts`.

## Commits

Imperative subject that states the effect of the change, no prefix, no trailing period, for example
`Quote shipping through Envora on the product page`.

## Changelog

`CHANGELOG.md` follows Keep a Changelog. The version lives in `package.json` and matches the latest
changelog title.
