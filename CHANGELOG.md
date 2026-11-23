# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Changed

- **Dialogs and side panels use native `<dialog>`; `@radix-ui/react-dialog` is removed.**
- Only the first product image gets high fetch priority; lower grids load lazily.
- Native form controls use the brand color.
- The checkout address form autofills the neighborhood and state.

### Fixed

- Split payment amounts no longer commit while an IME is still composing.

### Security

- **Next.js updated to 16.4.6 for a security advisory.**

## 0.2.0 - 2026-11-19

### Added

- **Reviews now show customers' photos and videos, filter by stars, sort, take helpful votes, and
  can be written with uploads from the product page.**
- **The product page now offers what is bought together, added in one click, and related products
  from the recommendations module; the cart suggests products and the home page lists best sellers.**
- **Customers can now sign in with Google, or with a one-time code by email or WhatsApp, falling back
  to email when WhatsApp is down, and link Google from their profile.**
- **Order pages now show the delivery: progress, the expected date and each parcel's tracking code.**
- **The storefront now renders and sends the store's emails (`/api/emails/send`), in its own look,
  with order templates for add-ons and a preview route in development.**
- **The checkout now lets a shopper pay one order in parts, such as Pix and card, with each part's
  discount from the server, and the order pages list each part's state.**
- **The `product_review` route (`/product/{slug}/review`) opens the review form.**
- **The mock WordPress now answers the reviews, recommendations, passwordless, Google, tracking and
  split payment routes.**

### Changed

- **Payment forms now charge the amount they are given, so a gateway can pay one part of a split.**
- **The demo is now an electronics store: 29 made-up products in eight categories, color and storage
  variations priced by storage, device drawings as images, and matching pages and posts.**
- **The demo now shows product photos you add to `mock-server/photos/`, as files or as links in
  `photos.json`, kept out of Git; products without one are still drawn.**
- **In development, `next/image` now optimizes images from local addresses, such as the mock or a
  WordPress on your machine.**

## 0.1.1 - 2026-10-30

### Added

- **The checkout now asks for what the store's Brazilian Market setup requires: date of birth, gender
  and a mandatory phone.**
- **External products now link to where they are sold, instead of offering a cart they cannot enter.**

### Changed

- **The checkout now offers only the gateways the Store API allows for the cart, and skips payment on
  free orders.**
- **Checkout errors now name the field the server refused, instead of a generic message.**
- **Problems the Store API reports on the cart now appear on the cart and checkout pages.**

### Fixed

- **Variable products with global attributes are now added with the taxonomy the Store API expects.**
- **The shipping address no longer carries an email, which only the billing address has.**
- **Products with attributes defined on the product no longer repeat React keys.**
- **The split payment gateway no longer appears as a method to pick.**
- **Pix now sends the buyer's document on stores without the Brazilian Market fields.**

## 0.1.0 - 2026-10-30

### Added

- **The storefront starter: catalog, cart, checkout, customer accounts and WordPress content, on the
  Headpress SDK.**
- **Integrations for Parcelas Customizadas, HubGo / Envora, Cielo, PayPal and Sellback, each in its
  own folder.**
- **A design system built on tokens, with its own primitives.**
- **A mock WordPress, so the store runs with no backend through `npm run demo`.**
- **Interface text in English, Portuguese and Spanish.**
