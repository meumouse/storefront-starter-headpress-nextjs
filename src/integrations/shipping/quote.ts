/**
 * HubGo / Envora: the shipping quote for a product before it is in the cart.
 *
 * HubGo was renamed to Envora, and a store may run either, or neither. The quote comes from the
 * first of these that exists:
 *
 *   1. `POST envora/v1/shipping/calculate` (the current plugin);
 *   2. `POST hubgo/v1/shipping/calculate` (HubGo 3.x, same contract);
 *   3. `hp.checkout.shippingQuote()`, Headpress's own quote over the WooCommerce rates (1.3+).
 *
 * A route that is not installed answers `404 rest_no_route`, which moves on to the next one. The one
 * that answered is remembered for the page's life, so only the first quote pays for the probing.
 * Any other error belongs to the quote and is shown as it is.
 *
 * Rates in the cart come from the Store API instead. See `delivery.ts`.
 */
import {
  isHeadpressError,
  moneyFromDecimal,
  type HeadpressClient,
  type Money,
  type ShippingQuote,
} from "@meumouse.com/headpress";

import { onlyDigits } from "@/lib/utils";

export interface ProductShippingInput {
  productId: number;
  variationId?: number;
  quantity?: number;
  postcode: string;
}

export interface ProductShippingRate {
  id: string;
  label: string;
  cost: Money;
  isFree: boolean;
  /** Ready to show ("Arrives in up to 6 business days"), or null when the carrier gives none. */
  delivery: string | null;
}

/** The Envora / HubGo answer. Amounts are decimal numbers. */
interface CalculateResponse {
  rates?: {
    id: string;
    label: string;
    cost: number;
    is_free?: boolean;
    delivery?: { headline?: string; label?: string };
  }[];
}

type QuoteSource = "envora/v1" | "hubgo/v1" | "headpress";

const CALCULATE_SOURCES = ["envora/v1", "hubgo/v1"] as const;
const SOURCES: readonly QuoteSource[] = [...CALCULATE_SOURCES, "headpress"];

/** The source that answered last. */
let resolvedSource: QuoteSource | null = null;

/** For tests. */
export function resetShippingSource(): void {
  resolvedSource = null;
}

function currencyCode(hp: Pick<HeadpressClient, "config">): string {
  return hp.config.peek()?.commerce?.currency.code ?? "BRL";
}

async function quoteFromCalculator(
  hp: Pick<HeadpressClient, "request" | "config">,
  api: (typeof CALCULATE_SOURCES)[number],
  input: ProductShippingInput,
  postcode: string,
): Promise<ProductShippingRate[]> {
  const body = new URLSearchParams({
    product: String(input.productId),
    postcode,
    qty: String(input.quantity ?? 1),
    country: "BR",
  });
  if (input.variationId) body.set("variation_id", String(input.variationId));

  const data = await hp.request<CalculateResponse>("/shipping/calculate", { api, method: "POST", body });
  const code = currencyCode(hp);

  return (data.rates ?? []).flatMap((rate) => {
    const cost = moneyFromDecimal(rate.cost, code);
    if (!cost) return [];
    return [
      {
        id: rate.id,
        label: rate.label,
        cost,
        isFree: rate.is_free === true || cost.amount === 0,
        delivery: rate.delivery?.headline || rate.delivery?.label || null,
      },
    ];
  });
}

function fromHeadpress(quote: ShippingQuote): ProductShippingRate[] {
  return quote.rates.map((rate) => ({
    id: rate.id,
    label: rate.label,
    cost: rate.cost,
    isFree: rate.cost.amount === 0,
    delivery: null,
  }));
}

/** Rates for a product and postcode, cheapest as the server ordered them. */
export async function quoteProductShipping(
  hp: Pick<HeadpressClient, "request" | "config" | "checkout">,
  input: ProductShippingInput,
): Promise<ProductShippingRate[]> {
  const postcode = onlyDigits(input.postcode);
  const start = resolvedSource ? SOURCES.indexOf(resolvedSource) : 0;

  for (const source of SOURCES.slice(start)) {
    try {
      const rates =
        source === "headpress"
          ? fromHeadpress(
              await hp.checkout.shippingQuote({
                productId: input.productId,
                variationId: input.variationId,
                quantity: input.quantity,
                postcode,
              }),
            )
          : await quoteFromCalculator(hp, source, input, postcode);
      resolvedSource = source;
      return rates;
    } catch (error) {
      const missing = isHeadpressError(error) && error.status === 404 && error.code === "rest_no_route";
      if (!missing || source === "headpress") throw error;
    }
  }

  return [];
}
