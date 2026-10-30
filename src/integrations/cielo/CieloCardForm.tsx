"use client";

import { money } from "@meumouse.com/headpress";
import { useHeadpress } from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Field, Input, Select } from "@/components/ui/field";
import type { PaymentFormProps } from "@/features/checkout/payments/types";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { fetchCieloInstallments } from "./api";
import {
  cvvLength,
  detectCieloBrand,
  maskCardNumber,
  maskExpiry,
  toCieloCardConfig,
  validateCieloCard,
  type CieloCardErrors,
  type CieloCardValues,
} from "./card";
import { prepareCieloCardPayment } from "./prepare-payment";

export function CieloCardForm({ method, cart, guest, getPayer, register }: PaymentFormProps) {
  const hp = useHeadpress();
  const config = toCieloCardConfig(method.config);
  const amount = cart.totals.total.amount;

  const [values, setValues] = useState<CieloCardValues>({
    number: "",
    holder: "",
    expiry: "",
    cvv: "",
    installments: config?.kind === "debit" ? 1 : null,
  });
  const [errors, setErrors] = useState<CieloCardErrors>({});
  const brand = detectCieloBrand(values.number);
  const isCredit = config?.kind === "credit";

  const plan = useQuery({
    queryKey: ["cielo-installments", amount, brand],
    queryFn: () => fetchCieloInstallments(hp, amount, brand),
    enabled: isCredit,
  });

  const update = (changes: Partial<CieloCardValues>) => {
    setValues((previous) => ({ ...previous, ...changes }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(changes)) delete next[key as keyof CieloCardValues];
      return next;
    });
  };

  // The handle reads the latest state through refs: the checkout keeps the one it was given.
  const latest = useRef({ values, getPayer });
  useEffect(() => {
    latest.current = { values, getPayer };
  });

  useEffect(() => {
    if (!config) return;
    register({
      submit: async () => {
        const { values: card, getPayer: readPayer } = latest.current;
        const problems = validateCieloCard(card, config.brands);
        setErrors(problems);
        const payer = readPayer();
        if (!payer || Object.keys(problems).length > 0) return null;
        return prepareCieloCardPayment({ hp, config, card, amount, payer, guest });
      },
    });
    return () => register(null);
    // `config` is rebuilt on each render from the same method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method.id, amount, guest, hp, register]);

  if (!config) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t.checkout.cardNumber} error={errors.number} className="sm:col-span-2">
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          value={values.number}
          onChange={(event) => update({ number: maskCardNumber(event.target.value) })}
        />
      </Field>
      <Field label={t.checkout.cardHolder} error={errors.holder} className="sm:col-span-2">
        <Input
          autoComplete="cc-name"
          value={values.holder}
          onChange={(event) => update({ holder: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.cardExpiry} error={errors.expiry}>
        <Input
          inputMode="numeric"
          autoComplete="cc-exp"
          value={values.expiry}
          onChange={(event) => update({ expiry: maskExpiry(event.target.value) })}
        />
      </Field>
      <Field label={t.checkout.cardCvv} error={errors.cvv}>
        <Input
          inputMode="numeric"
          autoComplete="cc-csc"
          maxLength={cvvLength(brand)}
          value={values.cvv}
          onChange={(event) => update({ cvv: event.target.value })}
        />
      </Field>
      {isCredit ? (
        <Field
          label={t.checkout.cardInstallments}
          error={errors.installments ?? (plan.isError ? t.checkout.installmentsError : undefined)}
          className="sm:col-span-2"
        >
          <Select
            value={values.installments ?? ""}
            disabled={!plan.data}
            onChange={(event) => update({ installments: Number(event.target.value) || null })}
          >
            <option value="">{plan.isPending ? t.checkout.installmentsLoading : t.checkout.cardInstallments}</option>
            {plan.data?.options.map((option) => {
              const currency = cart.totals.total.currency;
              const each = formatPrice(money(option.installment_amount, currency));
              const suffix = option.interest_free
                ? t.checkout.installmentInterestFree
                : t.checkout.installmentWithInterest(formatPrice(money(option.total, currency)));
              return (
                <option key={option.installments} value={option.installments}>
                  {`${t.checkout.installmentOption(option.installments, each)} (${suffix})`}
                </option>
              );
            })}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
