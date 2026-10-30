import type { Money, Product } from "@meumouse.com/headpress";

import { t } from "@/i18n";
import { priceHighlights } from "@/integrations/installments/pricing";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

type PricedProduct = Pick<
  Product,
  "price" | "regularPrice" | "priceRange" | "onSale" | "currency" | "extensions" | "pricePreview"
>;

function mainPrice(product: PricedProduct): string {
  const { priceRange } = product;
  const varies = priceRange && priceRange.min.amount !== priceRange.max.amount;
  return varies ? t.catalog.fromPrice(formatPrice((priceRange as { min: Money }).min)) : formatPrice(product.price);
}

/** The price with what Parcelas Customizadas adds to it. Every number comes from the server. */
export function ProductPrice({
  product,
  size = "md",
  className,
}: {
  product: PricedProduct;
  size?: "md" | "lg";
  className?: string;
}) {
  const { upfront, installment } = priceHighlights(product);

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("font-semibold", size === "lg" ? "text-3xl" : "text-base")}>{mainPrice(product)}</span>
        {product.onSale ? (
          <span className="text-sm text-ink-subtle line-through">
            <span className="sr-only">{t.catalog.wasPrice(formatPrice(product.regularPrice))}</span>
            <span aria-hidden>{formatPrice(product.regularPrice)}</span>
          </span>
        ) : null}
      </div>
      {upfront ? (
        <p className={cn("text-success", size === "lg" ? "text-base font-medium" : "text-sm")}>
          {t.catalog.upfrontPrice(formatPrice(upfront.price), upfront.label ?? t.catalog.upfrontDefault)}
        </p>
      ) : null}
      {installment ? (
        <p className="text-sm text-ink-muted">
          {t.catalog.installmentsLine(installment.count, formatPrice(installment.amount))}
          {installment.interestFree ? ` ${t.catalog.installmentsInterestFree}` : null}
        </p>
      ) : null}
    </div>
  );
}
