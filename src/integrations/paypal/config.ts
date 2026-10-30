/**
 * PayPal Store API (`paypal-store-api/v1`): what Headpress publishes in each method's `config`.
 * It carries no secrets. Contract: `docs/headpress.md` in the plugin.
 */
export type PayPalFlow = "wallet" | "card" | "pix" | "applepay" | "googlepay" | "plus";

export interface PayPalConfig {
  flow: PayPalFlow;
  clientId: string;
  intent: "capture" | "authorize";
  currency: string;
  locale: string;
  disableFunding: string;
}

const FLOWS: readonly string[] = ["wallet", "card", "pix", "applepay", "googlepay", "plus"];

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

export function toPayPalConfig(config: Record<string, unknown>): PayPalConfig | null {
  const flow = config.flow;
  if (typeof flow !== "string" || !FLOWS.includes(flow)) return null;
  return {
    flow: flow as PayPalFlow,
    clientId: text(config.clientId, ""),
    intent: config.intent === "authorize" ? "authorize" : "capture",
    currency: text(config.currency, "BRL"),
    locale: text(config.locale, "pt_BR"),
    disableFunding: text(config.disableFunding, ""),
  };
}

export function isPayPalGateway(id: string): boolean {
  return id === "paypal_store_api" || id.startsWith("paypal_store_api_");
}
