/**
 * Order emails. Headpress core sends none of these: an add-on registers them in the email catalog
 * (`Headpress/Emails/Catalog`) with a builder that returns this `data`. See `docs/EMAILS.md`.
 *
 * Money is in minor units, dates are ISO 8601, links are absolute storefront URLs. Optional fields
 * may be missing; the templates leave out what is not there.
 */
import { formatMoney, money } from "@meumouse.com/headpress";
import { Column, Img, Row, Section, Text } from "@react-email/components";
import { z } from "zod";

import { storeLocale, t } from "@/i18n";

import { emailColors, type EmailBrand } from "../brand";
import { EmailButton, EmailDivider, EmailHeading, EmailLayout, EmailText } from "../components/EmailLayout";
import { defineTemplate } from "../define";

const amount = z.number().int();
const text = z.string().trim();
const optionalText = text.nullish();
const optionalUrl = z.string().url().nullish();

const orderSchema = z.object({
  id: z.number().int().positive(),
  number: text.min(1),
  date: optionalText,
  /** The customer's order page on the storefront. */
  url: optionalUrl,
  currency: z.string().length(3).default("BRL"),
  currency_minor_unit: z.number().int().min(0).max(4).default(2),
  items: z
    .array(
      z.object({
        name: text.min(1),
        quantity: z.number().int().positive(),
        /** Line total, after discounts. */
        total: amount,
        image: optionalUrl,
        meta: z.array(z.object({ label: text, value: text })).max(20).default([]),
      }),
    )
    .max(100)
    .default([]),
  subtotal: amount,
  /** Discount as a positive amount. */
  discount: amount.nullish(),
  shipping: z.object({ label: optionalText, total: amount }).nullish(),
  total: amount,
  payment_method: optionalText,
  shipping_address: z.object({ name: optionalText, lines: z.array(text).max(8).default([]) }).nullish(),
});

const customerSchema = z.object({ first_name: optionalText }).default({});

type EmailOrder = z.infer<typeof orderSchema>;

function price(order: EmailOrder, value: number): string {
  return formatMoney(money(value, order.currency, order.currency_minor_unit), { locale: storeLocale });
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(storeLocale, { dateStyle: "long" });
}

const cell = { fontSize: "14px", lineHeight: "20px", margin: 0, color: emailColors.text } as const;
const mutedCell = { ...cell, color: emailColors.muted } as const;

function OrderSummary({ order }: { order: EmailOrder }) {
  const placed = formatDate(order.date);
  const totals = [
    { label: t.cart.subtotal, value: price(order, order.subtotal) },
    ...(order.discount ? [{ label: t.cart.discount, value: `−${price(order, order.discount)}` }] : []),
    ...(order.shipping
      ? [{ label: order.shipping.label || t.cart.shipping, value: price(order, order.shipping.total) }]
      : []),
  ];

  return (
    <Section>
      <Text style={{ ...cell, fontWeight: 600 }}>{t.emails.orderNumber(order.number)}</Text>
      {placed ? <Text style={{ ...mutedCell, marginBottom: "16px" }}>{t.emails.orderDate(placed)}</Text> : null}
      {order.items.map((item, index) => (
        <Row key={index} style={{ borderTop: `1px solid ${emailColors.line}`, padding: "12px 0" }}>
          {item.image ? (
            <Column style={{ width: "64px", paddingRight: "12px", verticalAlign: "top" }}>
              <Img src={item.image} alt="" width={56} height={56} style={{ borderRadius: "8px", objectFit: "cover" }} />
            </Column>
          ) : null}
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ ...cell, fontWeight: 600 }}>{item.name}</Text>
            {item.meta.map((entry) => (
              <Text key={entry.label} style={mutedCell}>
                {entry.label}: {entry.value}
              </Text>
            ))}
            <Text style={mutedCell}>{t.emails.quantity(item.quantity)}</Text>
          </Column>
          <Column style={{ width: "110px", textAlign: "right", verticalAlign: "top" }}>
            <Text style={cell}>{price(order, item.total)}</Text>
          </Column>
        </Row>
      ))}
      <Section style={{ borderTop: `1px solid ${emailColors.line}`, paddingTop: "12px" }}>
        {totals.map((row) => (
          <Row key={row.label}>
            <Column>
              <Text style={mutedCell}>{row.label}</Text>
            </Column>
            <Column style={{ textAlign: "right" }}>
              <Text style={mutedCell}>{row.value}</Text>
            </Column>
          </Row>
        ))}
        <Row>
          <Column>
            <Text style={{ ...cell, fontWeight: 700, paddingTop: "6px" }}>{t.cart.total}</Text>
          </Column>
          <Column style={{ textAlign: "right" }}>
            <Text style={{ ...cell, fontWeight: 700, paddingTop: "6px" }}>{price(order, order.total)}</Text>
          </Column>
        </Row>
      </Section>
      {order.payment_method || order.shipping_address ? <EmailDivider /> : null}
      {order.payment_method ? (
        <>
          <Text style={{ ...cell, fontWeight: 600 }}>{t.emails.paymentMethod}</Text>
          <Text style={{ ...mutedCell, marginBottom: "12px" }}>{order.payment_method}</Text>
        </>
      ) : null}
      {order.shipping_address ? (
        <>
          <Text style={{ ...cell, fontWeight: 600 }}>{t.emails.shippingAddress}</Text>
          {[order.shipping_address.name, ...order.shipping_address.lines].filter(Boolean).map((line, index) => (
            <Text key={index} style={mutedCell}>
              {line}
            </Text>
          ))}
        </>
      ) : null}
    </Section>
  );
}

function OrderEmail({
  brand,
  title,
  lead,
  firstName,
  order,
  children,
}: {
  brand: EmailBrand;
  title: string;
  lead: string;
  firstName: string | null | undefined;
  order: EmailOrder;
  children?: React.ReactNode;
}) {
  return (
    <EmailLayout brand={brand} preview={lead}>
      <EmailHeading>{title}</EmailHeading>
      <EmailText>{t.emails.greeting(firstName ?? "")}</EmailText>
      <EmailText muted>{lead}</EmailText>
      {children}
      {order.url ? (
        <Section style={{ margin: "8px 0 24px" }}>
          <EmailButton href={order.url}>{t.emails.viewOrder}</EmailButton>
        </Section>
      ) : null}
      <OrderSummary order={order} />
    </EmailLayout>
  );
}

const exampleOrder = {
  id: 1201,
  number: "1201",
  date: "2026-11-19T14:30:00-03:00",
  url: "http://localhost:3000/account/orders/1201",
  currency: "BRL",
  currency_minor_unit: 2,
  items: [
    {
      name: "Nova X15",
      quantity: 1,
      total: 539900,
      image: null,
      meta: [
        { label: "Color", value: "Graphite" },
        { label: "Storage", value: "256 GB" },
      ],
    },
    { name: "Pulse Buds Pro", quantity: 1, total: 89900, image: null, meta: [{ label: "Color", value: "White" }] },
  ],
  subtotal: 629800,
  discount: 31490,
  shipping: { label: "PAC", total: 0 },
  total: 598310,
  payment_method: "Pix",
  shipping_address: { name: "Ana Souza", lines: ["Av. Paulista, 1000 - Bela Vista", "São Paulo - SP", "01310-100"] },
};

export const orderReceived = defineTemplate({
  id: "order-received",
  schema: z.object({ customer: customerSchema, order: orderSchema }),
  subject: ({ order }) => t.emails.receivedSubject(order.number),
  render: ({ customer, order }, brand) => (
    <OrderEmail
      brand={brand}
      title={t.emails.receivedTitle}
      lead={t.emails.receivedLead}
      firstName={customer.first_name}
      order={order}
    />
  ),
  example: { customer: { first_name: "Ana" }, order: exampleOrder },
});

export const paymentConfirmed = defineTemplate({
  id: "payment-confirmed",
  schema: z.object({ customer: customerSchema, order: orderSchema }),
  subject: ({ order }) => t.emails.paidSubject(order.number),
  render: ({ customer, order }, brand) => (
    <OrderEmail brand={brand} title={t.emails.paidTitle} lead={t.emails.paidLead} firstName={customer.first_name} order={order} />
  ),
  example: { customer: { first_name: "Ana" }, order: exampleOrder },
});

const trackingSchema = z.object({ carrier: optionalText, code: text.min(1), url: optionalUrl });

export const orderShipped = defineTemplate({
  id: "order-shipped",
  schema: z.object({ customer: customerSchema, order: orderSchema, tracking: z.array(trackingSchema).max(10).default([]) }),
  subject: ({ order }) => t.emails.shippedSubject(order.number),
  render: ({ customer, order, tracking }, brand) => (
    <OrderEmail
      brand={brand}
      title={t.emails.shippedTitle}
      lead={t.emails.shippedLead}
      firstName={customer.first_name}
      order={order}
    >
      {tracking.map((parcel) => (
        <Section
          key={parcel.code}
          style={{ backgroundColor: emailColors.sunken, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}
        >
          <Text style={mutedCell}>{parcel.carrier || t.emails.trackingCode}</Text>
          <Text style={{ ...cell, fontFamily: "monospace", fontSize: "16px", fontWeight: 700, margin: "4px 0 12px" }}>
            {parcel.code}
          </Text>
          {parcel.url ? <EmailButton href={parcel.url}>{t.emails.trackDelivery}</EmailButton> : null}
        </Section>
      ))}
    </OrderEmail>
  ),
  example: {
    customer: { first_name: "Ana" },
    order: exampleOrder,
    tracking: [{ carrier: "Correios", code: "QB123456789BR", url: "https://rastreamento.correios.com.br/app/index.php" }],
  },
});
