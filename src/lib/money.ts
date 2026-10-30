import { formatMoney, type Money } from "@meumouse.com/headpress";

import { storeLocale } from "@/i18n";

/** An amount as text. Pure, so server and client render the same string. */
export function formatPrice(value: Money): string {
  return formatMoney(value, { locale: storeLocale });
}
