/**
 * Parcelas Customizadas (`wc-custom-installments`): the upfront price and the installments shown
 * next to a price.
 *
 * Two sources, both computed on the server by the plugin:
 *
 * - `extensions.headpress.installments.price_preview`, Headpress's compact preview, which the SDK
 *   normalizes as `product.pricePreview`;
 * - `extensions["wc-custom-installments"]`, the plugin's own data, with the full table.
 *
 * The preview wins when both exist. Nothing here computes a discount or an installment.
 */
import { moneyFromMinor, type Money, type PricePreview, type Product } from "@meumouse.com/headpress";

export const DEFAULT_EXTENSION_KEY = "wc-custom-installments";

interface StoreInstallment {
  count: number;
  amount: string;
  total: string;
  has_interest: boolean;
}

/** `extensions["wc-custom-installments"]` of a Store API product. */
export interface InstallmentsExtension {
  installments?: StoreInstallment[];
  best_installments?: {
    without_interest?: StoreInstallment | null;
    with_interest?: StoreInstallment | null;
  };
  discounts?: {
    main?: { price: string; savings: string; text_before?: string; text_after?: string } | null;
  };
  labels?: { without_interest?: string; with_interest?: string };
  currency_code?: string;
  currency_minor_unit?: number;
}

export interface InstallmentPlanView {
  count: number;
  amount: Money;
  total: Money;
  interestFree: boolean;
}

/** What a product card or page shows next to the price. */
export interface PriceHighlights {
  /** The upfront price (usually Pix) and the words the store uses for it. */
  upfront: { price: Money; label: string | null } | null;
  installment: InstallmentPlanView | null;
}

type PricedProduct = Pick<Product, "currency" | "extensions" | "pricePreview">;

export function installmentsExtension(
  product: Pick<Product, "extensions">,
  key = DEFAULT_EXTENSION_KEY,
): InstallmentsExtension | null {
  const extension = product.extensions[key];
  return extension && typeof extension === "object" ? (extension as InstallmentsExtension) : null;
}

function toPlan(entry: StoreInstallment, product: PricedProduct): InstallmentPlanView | null {
  const amount = moneyFromMinor(entry.amount, product.currency);
  const total = moneyFromMinor(entry.total, product.currency);
  return amount && total ? { count: entry.count, amount, total, interestFree: !entry.has_interest } : null;
}

/** The full installment table of a product, empty when it is not sold in installments. */
export function installmentPlans(product: PricedProduct, key?: string): InstallmentPlanView[] {
  const entries = installmentsExtension(product, key)?.installments ?? [];
  return entries.flatMap((entry) => toPlan(entry, product) ?? []);
}

function fromPreview(preview: PricePreview): PriceHighlights {
  return {
    upfront: preview.pix ? { price: preview.pix.price, label: null } : null,
    installment: preview.installments,
  };
}

/** The upfront price and best installment of a product, or nothing without the plugin. */
export function priceHighlights(product: PricedProduct, key?: string): PriceHighlights {
  if (product.pricePreview) return fromPreview(product.pricePreview);

  const extension = installmentsExtension(product, key);
  const best = extension?.best_installments?.without_interest ?? extension?.best_installments?.with_interest;
  const main = extension?.discounts?.main;
  const upfront = main ? moneyFromMinor(main.price, product.currency) : null;

  return {
    upfront: upfront ? { price: upfront, label: main?.text_after?.trim() || null } : null,
    installment: best ? toPlan(best, product) : null,
  };
}

/** `extensions["wc-custom-installments"].discounts.main` of the cart: the upfront total. */
export function cartUpfrontTotal(
  cart: { extensions: Record<string, unknown>; currency: Product["currency"] },
  key = DEFAULT_EXTENSION_KEY,
): { total: Money; label: string | null } | null {
  const extension = cart.extensions[key] as
    | { discounts?: { main?: { total?: string; text_after?: string } | null } }
    | undefined;
  const main = extension?.discounts?.main;
  const total = main?.total ? moneyFromMinor(main.total, cart.currency) : null;
  return total ? { total, label: main?.text_after?.trim() || null } : null;
}
