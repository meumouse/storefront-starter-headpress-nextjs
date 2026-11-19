"use client";

import type { Cart, PaymentMethod } from "@meumouse.com/headpress";
import { useCapability, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Alert, Skeleton } from "@/components/ui/feedback";
import { ChoiceLabel } from "@/components/ui/field";
import { t } from "@/i18n";

import { providerFor, selectableMethods, splitMethodFor } from "../payments/registry";
import type { Payer, PaymentFormHandle, PaymentSubmission } from "../payments/types";

interface PaymentSectionProps {
  cart: Cart;
  guest: boolean;
  selectedId: string | null;
  onSelect(method: PaymentMethod): void;
  getPayer(): Payer | null;
  register(handle: PaymentFormHandle | null): void;
  placeOrder(submission: PaymentSubmission): Promise<boolean>;
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
  const split = useCapability("split_payments");

  const methods = useMemo(() => {
    const single = selectableMethods(query.data ?? [], cart, split?.gateway_id);
    // Paying in parts comes last: most shoppers pay with one method.
    const splitMethod = splitMethodFor(query.data ?? [], cart, split);
    return splitMethod ? [...single, splitMethod] : single;
  }, [query.data, cart, split]);

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
                  amount={cart.totals.total}
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
