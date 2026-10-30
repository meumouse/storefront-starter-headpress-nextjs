"use client";

import { isValidCep, maskCep } from "@meumouse.com/headpress/br";
import { useCart } from "@meumouse.com/headpress/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { t } from "@/i18n";

/** Sends the postcode to the Store API, which answers with the cart's shipping rates. */
export function CartPostcodeForm() {
  const [{ cart }, { updateCustomer }] = useCart({ load: "never" });
  const [postcode, setPostcode] = useState(cart?.shippingAddress.postcode ?? "");
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = isValidCep(postcode);
    setInvalid(!valid);
    if (!valid) return;
    setSubmitting(true);
    await updateCustomer({ shipping_address: { postcode, country: "BR" } });
    setSubmitting(false);
  };

  return (
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
          value={maskCep(postcode)}
          onChange={(event) => setPostcode(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="secondary" loading={submitting}>
        {t.cart.calculate}
      </Button>
    </form>
  );
}
