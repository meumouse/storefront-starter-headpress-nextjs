/**
 * Sellback: abandoned cart recovery for a storefront that sells through the Store API. Carts are
 * tracked by the plugin as they change; the storefront only sends the shopper's contact, restores
 * carts from recovery links and shows the message preferences.
 * Contract: `docs/api/headless.md` in the plugin.
 */
import type { Cart, HeadpressClient } from "@meumouse.com/headpress";

const API = "sellback/v1";

/** The token is the only proof of who is asking, so these calls carry no cookies or referrer. */
const TOKEN_FETCH = { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" } as const;

export interface SellbackChannel {
  id: string;
  label: string;
  recipient_type: string;
  /** Masked contact (`an***@example.com`). */
  hint: string;
  subscribed: boolean;
  /** Blocked for another reason (bounce, spam complaint, manual block). */
  locked: boolean;
}

export interface RestoreResult {
  added: number;
  /** Names of products that are gone or out of stock. */
  skipped: string[];
  /** Set when the cart already became an unpaid order: send the shopper there. */
  payment_url: string | null;
}

interface SellbackCartExtension {
  tracked?: boolean;
  has_contact?: boolean;
  coupon?: string | null;
  restored?: RestoreResult | null;
}

export function sellbackCartData(cart: Pick<Cart, "extensions">): SellbackCartExtension {
  const headpress = cart.extensions.headpress as { sellback?: SellbackCartExtension } | undefined;
  return headpress?.sellback ?? {};
}

/** Put a recovery link's cart into the shopper's Store API cart. */
export async function restoreCart(
  hp: Pick<HeadpressClient, "cart">,
  token: string,
  messageId: number,
): Promise<RestoreResult | null> {
  const cart = await hp.cart.action("headpress", { action: "sellback.restore", token, message: messageId });
  return sellbackCartData(cart).restored ?? null;
}

export async function fetchPreferences(hp: Pick<HeadpressClient, "request">, token: string): Promise<SellbackChannel[]> {
  const data = await hp.request<{ channels: SellbackChannel[] }>("/store/preferences", {
    api: API,
    query: { token },
    fetchOptions: TOKEN_FETCH,
  });
  return data.channels;
}

/** Save the switches the shopper changed; channels left out keep their state. */
export async function savePreferences(
  hp: Pick<HeadpressClient, "request">,
  token: string,
  channels: Record<string, boolean>,
): Promise<SellbackChannel[]> {
  const data = await hp.request<{ channels: SellbackChannel[] }>("/store/preferences", {
    api: API,
    method: "PUT",
    body: { token, channels },
    fetchOptions: TOKEN_FETCH,
  });
  return data.channels;
}
