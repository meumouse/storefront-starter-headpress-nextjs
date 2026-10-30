# WooCommerce Store API compatibility

How the storefront uses the [Store API](https://developer.woocommerce.com/docs/apis/store-api/)
(`wc/store/v1`). All calls go through the Headpress SDK.

**Live** means the call was exercised against WordPress with WooCommerce and Headpress 1.6.0.
**Mock** means only against `mock-server`.

## Session

| Rule | How the storefront follows it | Checked |
| --- | --- | --- |
| A Cart-Token replaces the Nonce on `/cart` and `/checkout` | The SDK keeps it in the `hp_cart` cookie and sends `Cart-Token` | Live |
| Read the token from `GET /cart` | The SDK fetches one before the first write | Live |
| Replace an expired token | The SDK replays the call once with a new token | Mock |

## Endpoints

| Endpoint | Used by | Checked |
| --- | --- | --- |
| `GET /products`, `/products/{slug}` | Listings, product page | Live |
| `GET /products?type=variation&parent[]=` | Variations | Live |
| `GET /products/categories`, `/tags`, `/attributes` | Navigation, filters | Live |
| `GET /products/attributes/{id}/terms` | Filters | Mock (the test store has no global attributes) |
| `GET /products/collection-data` | SDK facets, not used by the listing yet | Live |
| `GET /cart`, `POST /cart/add-item` | Cart | Live |
| `POST /cart/update-customer`, `/select-shipping-rate` | Shipping | Live |
| `POST /cart/update-item`, `/remove-item`, `/apply-coupon`, `/remove-coupon` | Cart | Mock |
| `POST /cart/extensions` | Sellback recovery | Mock |
| `POST /checkout` | Checkout | Live |

## Contract details that matter

| Rule | Where it is handled |
| --- | --- |
| `add-item` takes the taxonomy for global attributes (`pa_color`) and the name for product attributes (`Cor`) | `addItemVariation()` |
| Product attributes have id `0`, and their term slugs may keep capitals (`Verde`) | Keys use names and slugs; values are sent as received |
| `email` exists only on `billing_address` | `toShippingAddress()` |
| Amounts are strings in minor units | The SDK normalizes them to `Money` |
| `cart.payment_methods` says which gateways this cart can use | `selectableMethods()` |
| `cart.needs_payment` can be false, on a free order | The checkout hides payment and sends no method |
| `cart.errors` reports problems with the cart itself | `CartNotices` |
| `has_calculated_shipping` is false until an address is known | The shipping step waits for the postcode |
| A cart can have several shipping packages | `ShippingOptions` renders one group per package |
| Errors can carry the current cart (`data.cart`) | The SDK refreshes the cart from them |
| `per_page` is at most 100 | Sitemap and variations stay within it |
| External products cannot enter the cart | The product page links to `add_to_cart.url` |

## Known gaps

| Gap | Effect | Plan |
| --- | --- | --- |
| The SDK's `place()` cannot send `expected_total` | If a price changes between the last cart read and the order, it is not refused with `409` | `TODO(sdk)` in `CheckoutForm` |
| Grouped products have no selector | They render without a way to buy | Backlog |
| WooCommerce's Additional Checkout Fields are not rendered | A store requiring one gets the server's message, naming the field | Backlog, through `additional_fields` |
| `customer_password` and `create_account` are not offered | Guests check out without creating an account | Backlog |
| Password-protected products | The description comes back empty | Backlog |
| `cross_sells` are not shown | No suggestions in the cart | Backlog |
| Retrying a failed order (`POST /checkout/{id}`) | The shopper starts a new order | Backlog |

The official docs do not list a rate-limit or error guide among the pages reviewed. Rate limiting is
a store setting, and the SDK reports a `429` like any other error.
