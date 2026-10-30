"use client";

import type { PaymentMethod } from "@meumouse.com/headpress";
import { useEffect, useRef } from "react";

import { t } from "@/i18n";

import type { PaymentFormProps } from "../payments/types";

/**
 * Pix collects nothing at checkout: the code comes back with the order. The gateway still needs the
 * buyer's document, which stores without the Brazilian Market fields only send through `payment_data`.
 *
 * @param documentKey The `payment_data` key of the document for a method.
 */
export function createPixForm(documentKey: (method: PaymentMethod) => string) {
  return function PixForm({ method, getPayer, register }: PaymentFormProps) {
    // The handle reads the latest function through a ref: the checkout keeps the one it was given.
    const latestGetPayer = useRef(getPayer);
    useEffect(() => {
      latestGetPayer.current = getPayer;
    });

    useEffect(() => {
      register({
        submit: async () => {
          const payer = latestGetPayer.current();
          return payer ? [{ key: documentKey(method), value: payer.document }] : null;
        },
      });
      return () => register(null);
    }, [method, register]);

    return <p className="text-sm text-ink-muted">{t.checkout.pixCheckout}</p>;
  };
}
