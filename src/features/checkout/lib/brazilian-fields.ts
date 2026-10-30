import { firstFieldMessage, isHeadpressError } from "@meumouse.com/headpress";
import { canonicalPhone, parseBirthDate } from "@meumouse.com/headpress/br";

import type { ContactValues } from "./address";

/** What the store's Brazilian Market setup asks for (`modules.checkout_fields.brazilian_market`). */
export interface BrazilianMarketRules {
  active?: boolean;
  birthdate?: boolean;
  gender?: boolean;
  cell_phone?: "off" | "optional" | "required" | "phone_label";
}

export interface PersonalValues {
  /** As typed: `DD/MM/AAAA`. */
  birthdate: string;
  gender: string;
}

export type PersonalErrors = Partial<Record<keyof PersonalValues | "phone", true>>;

/** The fields this store requires that the address form does not cover. */
export function validatePersonal(
  values: PersonalValues,
  contact: ContactValues,
  rules: BrazilianMarketRules | undefined,
): PersonalErrors {
  const errors: PersonalErrors = {};
  if (rules?.birthdate && !parseBirthDate(values.birthdate)) errors.birthdate = true;
  if (rules?.gender && !values.gender) errors.gender = true;
  if (rules?.cell_phone === "required" && !canonicalPhone(contact.phone)) errors.phone = true;
  return errors;
}

/** The server names the field it refused; the SDK's text for that code does not. */
export function checkoutErrorMessage(
  error: unknown,
  format: (error: unknown, context?: string) => string,
  fallback: string,
): string {
  if (!isHeadpressError(error)) return fallback;
  return firstFieldMessage(error) ?? format(error, "checkout");
}
