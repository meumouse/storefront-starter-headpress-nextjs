"use client";

import type { Cart, PaymentMethod } from "@meumouse.com/headpress";
import { useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Alert, Skeleton } from "@/components/ui/feedback";
import { ChoiceLabel } from "@/components/ui/field";
import { t } from "@/i18n";

import { providerFor } from "../payments/registry";
import type { Payer, PaymentData, PaymentFormHandle } from "../payments/types";

interface PaymentSectionProps {
  cart: Cart;
  guest: boolean;
  selectedId: string | null;
  onSelect(method: PaymentMethod): void;
  getPayer(): Payer | null;
  register(handle: PaymentFormHandle | null): void;
  placeOrder(paymentData: PaymentData): Promise<boolean>;
  onError(message: string): void;
}

export function PaymentSection({
  cart,
  guest,
  selectedId,
  onSelect,
  getPayer,
  register,
  placeOrder,
  onError,
}: PaymentSectionProps) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const query = useQuery({ queryKey: ["payment-methods"], queryFn: () => hp.checkout.paymentMethods() });

  // Methods without a provider stay out: a card method with no form could never be paid.
  const methods = useMemo(
    () =>
      (query.data ?? []).filter((method) => {
        const supported = providerFor(method) !== null;
        if (!supported) console.warn(`[checkout] No payment provider for "${method.id}" (${method.kind}).`);
        return supported;
      }),
    [query.data],
  );

  if (query.isPending) return <Skeleton className="h-40" />;
  if (query.isError) return <Alert tone="danger">{formatError(query.error)}</Alert>;
  if (methods.length === 0) return <Alert tone="warning">{t.checkout.paymentEmpty}</Alert>;

  return (
    <div className="flex flex-col gap-2">
      {methods.map((method) => {
        const selected = method.id === selectedId;
        const provider = providerFor(method);
        const Form = provider?.Form;
        return (
          <div key={method.id} className="rounded-control border border-line has-checked:border-brand">
            <ChoiceLabel
              type="radio"
              name="payment-method"
              className="p-3 font-medium"
              checked={selected}
              onChange={() => onSelect(method)}
            >
              {method.title}
            </ChoiceLabel>
            {selected && Form ? (
              <div className="border-t border-line p-3">
                <Form
                  method={method}
                  cart={cart}
                  guest={guest}
                  getPayer={getPayer}
                  register={register}
                  placeOrder={placeOrder}
                  onError={onError}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
