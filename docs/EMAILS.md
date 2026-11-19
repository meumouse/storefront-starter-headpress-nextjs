# Transactional emails

Headpress decides **when** an email goes out and **with which data**; the storefront owns the
**design** and the **provider**. With the Headpress `emails` module on, every email WordPress sends
reaches `POST /api/emails/send`, signed, and leaves in the store's look.

## How it flows

1. An event happens in WordPress (an order is paid, a customer asks for a code, WooCommerce sends a
   notice).
2. Headpress posts `{ template, to, data, idempotency_key }` to the storefront, signed with the
   webhook secret.
3. `src/app/api/emails/send/route.ts` checks the signature, finds the template in
   `src/features/emails/registry.ts`, validates `data` with the template's schema, renders it with
   React Email and sends it.
4. The answer tells Headpress what to do: 2xx is final, 503 retries (1 minute, 10 minutes, 1 hour,
   with the same idempotency key), any other 4xx is permanent.

The full contract is in the Headpress plugin: `docs/api/emails.md`.

## Setting it up

| Where | What |
| --- | --- |
| Headpress → Storefront | The storefront URL and the webhook secret (the same as the revalidation webhook). |
| Headpress → Modules | Turn on **Emails**. Leave *Route wp_mail* on so every WordPress email goes through here. |
| Storefront env | `HEADPRESS_WEBHOOK_SECRET`, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`. |

| Variable | Meaning |
| --- | --- |
| `EMAIL_PROVIDER` | `log` (default) accepts emails and sends nothing, for development. `resend` sends through [Resend](https://resend.com). |
| `RESEND_API_KEY` | Resend API key. |
| `EMAIL_FROM` | `Store name <orders@example.com>`, on a domain verified at the provider. |
| `EMAIL_REPLY_TO` | Default reply-to, when Headpress does not send one. |
| `EMAIL_LOGO_URL` | Absolute URL of a PNG or JPEG logo for the header. Without it, the store name. |

The store name comes from Headpress (`config.store.name`), the link from `NEXT_PUBLIC_SITE_URL`.

Use another provider by replacing `sendWithResend()` in `src/features/emails/send.ts`: it receives
the rendered subject, HTML and text, and answers whether a retry is worth it.

## Templates

| Template | Sent by | Data |
| --- | --- | --- |
| `wp-mail` | Headpress core, for every `wp_mail()`: one-time codes, password resets, WooCommerce emails without a template of their own | `{ subject, body, html }` |
| `order-received` | An add-on (below) | `{ customer, order }` |
| `payment-confirmed` | An add-on | `{ customer, order }` |
| `order-shipped` | An add-on | `{ customer, order, tracking[] }` |

Headpress core registers no order emails: while only `wp-mail` is on, WooCommerce's own emails reach
the storefront as plain text inside the store's frame. The order templates are ready for an add-on
that sends structured data, and render well in every client.

The shapes are in `src/features/emails/templates/orders.tsx` (zod schemas). Money is in minor units,
dates are ISO 8601, links are absolute.

### Registering an order email in WordPress

```php
add_filter( 'Headpress/Emails/Catalog', function ( array $emails ) {
	$emails['payment-confirmed'] = array(
		'label'    => __( 'Payment confirmed', 'my-store' ),
		'audience' => 'customer',
		'events'   => array( 'order.paid' ),
		'replaces' => array( 'customer_processing_order' ),
		'build'    => function ( array $payload ): array {
			$order = wc_get_order( (int) ( $payload['id'] ?? 0 ) );
			if ( ! $order || ! $order->get_billing_email() ) {
				return array();
			}

			$minor = static fn( $value ) => (int) round( (float) $value * 100 );

			return array(
				array(
					'key'      => 'order:' . $order->get_id(),
					'to'       => array( $order->get_billing_email() ),
					'order_id' => $order->get_id(),
					'data'     => array(
						'customer' => array( 'first_name' => $order->get_billing_first_name() ),
						'order'    => array(
							'id'             => $order->get_id(),
							'number'         => $order->get_order_number(),
							'date'           => $order->get_date_created()?->format( DATE_ATOM ),
							'url'            => home_url( '/account/orders/' . $order->get_id() ),
							'currency'       => $order->get_currency(),
							'items'          => array_values( array_map(
								fn( $item ) => array(
									'name'     => $item->get_name(),
									'quantity' => $item->get_quantity(),
									'total'    => $minor( $item->get_total() ),
								),
								$order->get_items()
							) ),
							'subtotal'       => $minor( $order->get_subtotal() ),
							'discount'       => $minor( $order->get_discount_total() ),
							'shipping'       => array( 'label' => $order->get_shipping_method(), 'total' => $minor( $order->get_shipping_total() ) ),
							'total'          => $minor( $order->get_total() ),
							'payment_method' => $order->get_payment_method_title(),
						),
					),
				),
			);
		},
	);

	return $emails;
} );
```

Use the storefront's own order URL: the account page for customers, or the order-received route
(`/checkout/order-received?order_id=…&key=…`) for guests, which also shows the delivery tracking.

## Adding a template

1. Create it under `src/features/emails/templates/` with `defineTemplate()`: an id, a zod schema, a
   subject, a render function and example data.
2. List it in `src/features/emails/registry.ts`.
3. Preview it at `/api/emails/preview?template=<id>` (development only; `&format=text` for the text
   part).
4. Register the email in Headpress with the same id.

Texts come from `src/i18n/emails.ts`, colors from `src/features/emails/brand.ts` (the tokens resolved
to hex: email clients do not read CSS variables).
