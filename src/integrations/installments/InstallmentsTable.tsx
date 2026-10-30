import type { Product } from "@meumouse.com/headpress";
import { ChevronDown } from "lucide-react";

import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { installmentPlans } from "./pricing";

/** The full table Parcelas Customizadas publishes. Renders nothing without one. */
export function InstallmentsTable({ product }: { product: Pick<Product, "currency" | "extensions" | "pricePreview"> }) {
  const plans = installmentPlans(product);
  if (plans.length === 0) return null;

  return (
    <details className="group rounded-card border border-line p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
        {t.cart.installmentsTitle}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {plans.map((plan) => (
          <li key={plan.count} className="flex justify-between gap-3">
            <span>{t.cart.installmentRow(plan.count, formatPrice(plan.amount))}</span>
            <span className="text-ink-muted">
              {plan.interestFree ? t.cart.interestFree : t.cart.installmentTotal(formatPrice(plan.total))}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
