import type { Address } from "@meumouse.com/headpress";
import type { AddressFormValues } from "@meumouse.com/headpress/controllers";

import type { Payer } from "../payments/types";
import { onlyDigits } from "@/lib/utils";

export interface ContactValues {
  email: string;
  phone: string;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The address for the Store API. Stores with the Brazilian Market fields keep the number and the
 * neighborhood in their own fields (`checkoutFields()`); without them, `address_1` and `address_2`
 * carry those values, or they would be lost.
 */
export function toStoreAddress(
  values: AddressFormValues,
  contact: ContactValues,
  options: { brazilianFields: boolean },
): Partial<Address> {
  const street = values.address_1 ?? "";
  const complement = values.address_2 ?? "";
  const neighborhood = values.neighborhood ?? "";

  return {
    first_name: values.first_name ?? "",
    last_name: values.last_name ?? "",
    address_1: options.brazilianFields ? street : [street, values.number].filter(Boolean).join(", "),
    address_2: options.brazilianFields ? complement : [complement, neighborhood].filter(Boolean).join(" - "),
    city: values.city ?? "",
    state: values.state ?? "",
    postcode: onlyDigits(values.postcode ?? ""),
    country: "BR",
    phone: onlyDigits(contact.phone),
    email: contact.email.trim(),
  };
}

/** The same address for delivery. In the Store API, `email` only exists on the billing address. */
export function toShippingAddress(billing: Partial<Address>): Partial<Address> {
  const shipping = { ...billing };
  delete shipping.email;
  return shipping;
}

export function toPayer(values: AddressFormValues, contact: ContactValues): Payer {
  return {
    firstName: values.first_name ?? "",
    lastName: values.last_name ?? "",
    email: contact.email.trim(),
    phone: contact.phone,
    document: onlyDigits(values.document ?? ""),
    street: values.address_1 ?? "",
    number: values.number ?? "",
    complement: values.address_2 ?? "",
    neighborhood: values.neighborhood ?? "",
    city: values.city ?? "",
    state: values.state ?? "",
    postcode: onlyDigits(values.postcode ?? ""),
  };
}
