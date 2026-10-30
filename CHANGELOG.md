# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
