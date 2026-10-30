# Connecting a real WordPress

## Requirements

| Software | Version |
| --- | --- |
| WordPress with WooCommerce | Current |
| Headpress | 1.3 or newer (1.2 works without shipping quotes and price previews) |
| Node.js for the storefront | 22.18 or newer (24 in the `Dockerfile`) |

## WordPress

1. Install and activate Headpress and the plugins you will use.
2. In **Headpress → Storefront**, set the storefront URL and allowed origins.
3. Set the routes to match `src/config/routes.ts`. `npm run check:routes` shows any difference.
4. List routes this starter has no page for under **Routes without a storefront page**:
   `category`, `post_tag`, `order_pay`, `product_review`.
5. Under **Other REST namespaces for the storefront**, add `envora/v1` or `hubgo/v1`. Cielo, PayPal
   and Sellback register their namespaces themselves.
6. In **Headpress → Storefront → Webhooks**, point the webhook at
   `https://your-store.example.com/api/revalidate` and copy the secret.
7. Turn on the modules you need: `search`, `reviews`, `accounts`, `wishlist`, `address_book`,
   `content`, `consent`, `checkout_fields`.
8. In Parcelas Customizadas, turn on **Advanced → Headless → Headless mode**.
9. Create the `primary` and `footer` menus. Without them, the header lists the product categories.

## Storefront

```bash
cp .env.example .env.local
```

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_WP_URL` | WordPress URL |
| `NEXT_PUBLIC_SITE_URL` | This storefront's URL |
| `NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY` | Publishable key, when the store requires one |
| `NEXT_PUBLIC_STORE_LOCALE` | `en`, `pt-BR` or `es` |
| `HEADPRESS_SECRET_KEY` | Secret key, so rate limits apply per shopper |
| `HEADPRESS_WEBHOOK_SECRET` | The webhook secret |

```bash
npm run check:routes
```

```bash
npm run dev
```

## Validation checklist

The starter was built against the plugins' documented contracts and exercised against the mock
server, not against a live WordPress. Go through this on your first real connection:

- [ ] `npm run check:routes` passes.
- [ ] Products, variations and prices match WooCommerce.
- [ ] Installments on the product page match Parcelas Customizadas.
- [ ] The product shipping calculator answers, and the browser console shows no CORS error.
- [ ] A cart gets rates, and the delivery estimates appear.
- [ ] Cielo sandbox: credit, debit with 3DS, and Pix (paying through the plugin's sandbox route).
- [ ] PayPal sandbox: wallet, card, and Pix.
- [ ] A recovery email link restores the cart with the coupon.
- [ ] The unsubscribe link opens the preferences page.
- [ ] Editing a product in WordPress updates the storefront after the webhook.
- [ ] Sign-in survives a reload, and a guest cart merges into the customer's.

## Deploying

The `Dockerfile` builds a standalone server. `NEXT_PUBLIC_*` values are inlined at build time, so they
go in as build args:

```bash
docker build --build-arg NEXT_PUBLIC_WP_URL=https://wp.example.com --build-arg NEXT_PUBLIC_SITE_URL=https://shop.example.com -t storefront .
```

`HEADPRESS_SECRET_KEY` and `HEADPRESS_WEBHOOK_SECRET` are runtime variables: set them on the container.
