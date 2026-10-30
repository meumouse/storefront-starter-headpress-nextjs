import { en as sdkEn } from "@meumouse.com/headpress/messages/en";
import { es as sdkEs } from "@meumouse.com/headpress/messages/es";
import { ptBR as sdkPtBr } from "@meumouse.com/headpress/messages/pt-BR";

import { publicEnv } from "@/lib/env";

import { account } from "./account";
import { cart } from "./cart";
import { catalog } from "./catalog";
import { checkout } from "./checkout";
import { common } from "./common";
import { LOCALES, type Locale } from "./define";

export type { Locale };

/** The store's language. One per deployment: `NEXT_PUBLIC_STORE_LOCALE`. */
export const storeLocale: Locale = LOCALES.find((entry) => entry === publicEnv.locale) ?? "en";

/** Interface text in the store's language. */
export const t = {
  common: common[storeLocale],
  catalog: catalog[storeLocale],
  cart: cart[storeLocale],
  checkout: checkout[storeLocale],
  account: account[storeLocale],
};

/** The SDK's dictionary for API errors, in the same language. */
export const sdkMessages = { en: sdkEn, "pt-BR": sdkPtBr, es: sdkEs }[storeLocale];
