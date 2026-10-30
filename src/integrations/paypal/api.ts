import type { HeadpressClient } from "@meumouse.com/headpress";

import type { Payer } from "@/features/checkout/payments/types";

import type { PayPalFlow } from "./config";

const API = "paypal-store-api/v1";

type Client = Pick<HeadpressClient, "request">;

/** Create the PayPal order from the cart. The server reads the amount; the browser never sends one. */
export async function createPayPalOrder(hp: Client, flow: PayPalFlow, payer: Payer): Promise<string> {
  const body =
    flow === "card"
      ? {
          context: "card",
          payer: {
            first_name: payer.firstName,
            last_name: payer.lastName,
            email: payer.email,
            document: payer.document,
            address_1: `${payer.street}, ${payer.number}`,
            city: payer.city,
            state: payer.state,
            postcode: payer.postcode,
            country: "BR",
          },
        }
      : { context: "checkout" };

  const order = await hp.request<{ id: string }>("/orders", {
    api: API,
    method: "POST",
    auth: "optional",
    cartToken: true,
    body,
  });
  return order.id;
}

/** Report a browser failure to the server's log. Best effort. */
export function reportPayPalError(hp: Client, stage: string, message: string): void {
  void hp
    .request("/client-errors", { api: API, method: "POST", body: { stage, message: message.slice(0, 300) } })
    .catch(() => undefined);
}

export async function fetchPayPalPixStatus(hp: Client, orderId: number, key: string): Promise<string> {
  const data = await hp.request<{ status: string }>(`/pix/${orderId}`, { api: API, query: { key } });
  return data.status;
}
