"use client";

import { isValidCep, maskCep } from "@meumouse.com/headpress/br";
import { useCapability, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useMutation } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { quoteProductShipping, type ProductShippingInput } from "./quote";

export function ProductShippingCalculator({
  productId,
  variationId,
  quantity,
}: Omit<ProductShippingInput, "postcode">) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const shipping = useCapability("shipping");
  const [postcode, setPostcode] = useState("");
  const [invalid, setInvalid] = useState(false);

  const quote = useMutation({
    mutationFn: (input: ProductShippingInput) => quoteProductShipping(hp, input),
  });

  if (shipping && !shipping.calculator) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const valid = isValidCep(postcode);
    setInvalid(!valid);
    if (valid) quote.mutate({ productId, variationId, quantity, postcode });
  };

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4" aria-hidden />
        {t.cart.calculatorTitle}
      </h2>
      <form onSubmit={submit} className="flex items-start gap-2">
        <Field
          label={t.cart.postcodeLabel}
          className="flex-1 [&_label]:sr-only"
          error={invalid ? t.cart.postcodeInvalid : undefined}
        >
          <Input
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={t.cart.postcodePlaceholder}
            value={postcode}
            onChange={(event) => setPostcode(maskCep(event.target.value))}
          />
        </Field>
        <Button type="submit" variant="secondary" loading={quote.isPending}>
          {t.cart.calculate}
        </Button>
      </form>

      {quote.error ? <Alert tone="danger">{formatError(quote.error)}</Alert> : null}
      {quote.data?.length === 0 ? <p className="text-sm text-ink-muted">{t.cart.noRates}</p> : null}
      {quote.data && quote.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {quote.data.map((rate) => (
            <li key={rate.id} className="flex items-start justify-between gap-4 py-2">
              <span>
                {rate.label}
                {rate.delivery ? <span className="block text-xs text-ink-muted">{rate.delivery}</span> : null}
              </span>
              <span className="font-medium">{rate.isFree ? t.cart.shippingFree : formatPrice(rate.cost)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
