/**
 * The contract between the checkout and a payment gateway.
 *
 * The checkout knows nothing about gateways: it asks the registry for the provider of each method
 * the server offers, renders its `Form`, and on submit asks that form for the `payment_data`.
 * Gateway knowledge stays in `src/integrations/<gateway>`.
 */
import type { Cart, HeadpressClient, PaymentMethod, PlacedOrder } from "@meumouse.com/headpress";
import type { ComponentType } from "react";

export type PaymentData = readonly { key: string; value: string }[];

/** The buyer as the checkout has them, for gateways that ask for it (3DS, card forms). */
export interface Payer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** CPF or CNPJ, digits only. */
  document: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
}

/** A failure the shopper can solve. `message` is already in the interface language. */
export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export interface PaymentFormHandle {
  /** Validate and prepare the payment. Throws `PaymentError`; resolves null when the form shows why. */
  submit(): Promise<PaymentData | null>;
}

export interface PaymentFormProps {
  method: PaymentMethod;
  cart: Cart;
  guest: boolean;
  /** The buyer, or null after the checkout has highlighted what is missing. */
  getPayer(): Payer | null;
  /** The form's submit step. The checkout calls it when the shopper places the order. */
  register(handle: PaymentFormHandle | null): void;
  /** For providers with their own button (`submitsItself`). Resolves whether the order was placed. */
  placeOrder(paymentData: PaymentData): Promise<boolean>;
  onError(message: string): void;
}

/** What the shopper still has to do after placing the order. */
export type PendingPayment =
  | { type: "pix"; code: string; imageUrl: string | null; expiresAt: string | null }
  | { type: "boleto"; url: string; barcode: string | null };

export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export interface OrderRef {
  orderId: number;
  orderKey: string;
}

export interface PaymentProvider {
  id: string;
  supports(method: PaymentMethod): boolean;
  Form: ComponentType<PaymentFormProps>;
  /** The provider draws its own button, so the checkout hides "Place order". */
  submitsItself?: boolean;
  /** What to show after the order is placed. */
  pendingPayment?(order: PlacedOrder): PendingPayment | null;
  /** Ask the gateway how an async payment is going. */
  pollStatus?(hp: Pick<HeadpressClient, "request">, order: OrderRef): Promise<PaymentStatus>;
}
