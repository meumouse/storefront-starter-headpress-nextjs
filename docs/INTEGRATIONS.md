# Integrations

Each plugin has one folder under `src/integrations`. Nothing outside that folder knows the plugin's
routes, keys or payload shapes. Every integration is optional: a store without the plugin simply does
not show that feature.

## Parcelas Customizadas

`src/integrations/installments` · plugin `wc-custom-installments`

| Data | Source |
| --- | --- |
| Upfront price and best installment | `extensions.headpress.installments.price_preview` (`product.pricePreview`), else `extensions["wc-custom-installments"]` |
| Full installment table | `extensions["wc-custom-installments"].installments` |
| Upfront total of the cart | `extensions["wc-custom-installments"].discounts.main` of the cart |

No number is computed here. Turn on **Advanced → Headless → Headless mode** in the plugin, so it stops
rendering its own storefront markup.

## HubGo / Envora

`src/integrations/shipping` · plugin `hubgo` (`envora/v1`, formerly `hubgo/v1`)

| Where | How |
| --- | --- |
| Product page | `quoteProductShipping()` tries `envora/v1`, then `hubgo/v1`, then `hp.checkout.shippingQuote()`. A missing route (`rest_no_route`) moves on; any other error is shown. |
| Cart and checkout | Rates come from the Store API. `rateDelivery()` reads the estimate from `extensions.headpress.shipping`. |

`modules.shipping.calculator = false` hides the product calculator. List `envora/v1` under
**Headpress → Storefront → Other REST namespaces**, so the browser can call it.

## Cielo

`src/integrations/cielo` · plugin `wc-cielo-store-api` (`wc-cielo/v1`)

| Gateway | Flow |
| --- | --- |
| `cielo_credit` | Silent Order Post token, then installments, then optional 3DS, then checkout |
| `cielo_debit` | Same, with 3DS always required |
| `cielo_pix` | Checkout with the document in `payment_data`, then QR code and copy-paste code, then polling until paid |

Card flow (`prepare-payment.ts`):

1. `POST store/sop/access-token`, one token per card, from the browser so the buyer's IP counts.
2. Cielo's Silent Order Post script turns the card into a single-use `PaymentToken`. The card number
   and CVV never reach this server or WordPress.
3. `GET store/installments` confirms the plan for that brand and gives the charged total.
4. `POST store/3ds/access-token`, then Cielo's MPI script authenticates that total.
5. `hp.checkout.place()` sends the `payment_data` keys the gateway config names.

Both scripts must load from Cielo's servers: the 3DS script has an integrity check. Saved cards are
not in the starter yet.

## PayPal

`src/integrations/paypal` · plugin `paypal-store-api` (`paypal-store-api/v1`)

| Flow | How |
| --- | --- |
| `wallet`, `card` | `PayPalButtons` loads the PayPal JS SDK with the config Headpress publishes. On click, `POST /orders` creates the order from the cart; on approval, the Store API checkout captures it with `paypal_order_id`. |
| `pix` | Checkout with the buyer's document. `GET /pix/{order_id}?key=` follows the payment. |

Apple Pay, Google Pay and PayPal Plus flows are not in the starter. A method with one of those flows
is hidden at checkout, because no provider supports it.

## Sellback

`src/integrations/sellback` · plugin `sellback` (`sellback/v1`)

| Feature | Where |
| --- | --- |
| Contact capture | `useContactCapture()` at checkout, only after the shopper opts in |
| Recovery link | `/cart/recover/[token]` runs `sellback.restore` through `hp.cart.action()`, then opens the checkout |
| Recovery coupon banner | `RecoveryCouponBanner` reads `extensions.headpress.sellback.coupon` |
| Message preferences | `/unsubscribe/[token]`, one switch per channel |

Token pages stay out of page views and order attribution (`paths.ts`). Calls that carry a token send
no cookies and no referrer.

## Adding a payment gateway

1. Create `src/integrations/<gateway>/`.
2. Write a form component that takes `PaymentFormProps`. Call `register({ submit })`, where `submit`
   resolves the `payment_data`, or throws `PaymentError` with a message for the shopper.
3. Export a `PaymentProvider`:

   ```ts
   export const myGatewayProvider: PaymentProvider = {
     id: "my-gateway",
     supports: (method) => method.id === "my_gateway",
     Form: MyGatewayForm,
   };
   ```

4. Add it to `providers` in `src/features/checkout/payments/registry.ts`.
5. Have the WordPress plugin publish its public config through
   `Headpress/Store/Payment_Method_Config/{gateway}`, including `kind`.

Add `pendingPayment` when the order needs a follow-up from the shopper, `pollStatus` when the
gateway can be asked how it went, and `submitsItself` when the gateway draws its own button.

## Removing an integration

| To remove | Delete | Then edit |
| --- | --- | --- |
| Cielo or PayPal | Its folder | The import and line in `registry.ts` |
| Sellback | Its folder, `app/(store)/cart/recover`, `app/(store)/unsubscribe` | Banner in `CartPageContent` and `CheckoutForm`, capture in `CheckoutForm`, token check in `AnalyticsBridge`, the two routes in `config/routes.ts` |
| Parcelas Customizadas | Its folder | `ProductPrice`, `ProductPurchase`, `CartTotals` |
| HubGo / Envora | Its folder | `ProductPurchase`, `ShippingOptions` |
