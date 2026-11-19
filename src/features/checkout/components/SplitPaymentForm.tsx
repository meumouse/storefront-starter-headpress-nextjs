"use client";

import { money, type Money, type PaymentMethod } from "@meumouse.com/headpress";
import type { SplitBuilderState } from "@meumouse.com/headpress/controllers";
import {
  useCapability,
  useFormatError,
  useHeadpress,
  useSplitBuilder,
} from "@meumouse.com/headpress/react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { storeLocale, t } from "@/i18n";
import { formatPrice } from "@/lib/money";

import { defaultLegs, parseAmountInput, splitLegMethods, withRemainder, type ProviderLookup } from "../payments/split";
import {
  isSplitPlan,
  PaymentError,
  type PaymentData,
  type PaymentFormHandle,
  type PaymentFormProps,
} from "../payments/types";

function amountText(value: Money): string {
  return new Intl.NumberFormat(storeLocale, {
    minimumFractionDigits: value.minorUnit,
    maximumFractionDigits: value.minorUnit,
    useGrouping: false,
  }).format(value.amount / 10 ** value.minorUnit);
}

/** Typed freely, committed on blur or Enter, so a half-typed amount never reaches the quote. */
function AmountInput({ value, onCommit }: { value: Money; onCommit(amount: number): void }) {
  const [text, setText] = useState(() => amountText(value));
  const commit = () => {
    const amount = parseAmountInput(text, value.minorUnit);
    if (amount === null || amount === value.amount) setText(amountText(value));
    else onCommit(amount);
  };
  return (
    <Input
      inputMode="decimal"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}

function problemMessage(state: SplitBuilderState, minLegs: number, maxLegs: number, minLeg: Money): string | null {
  const [problem] = state.problems;
  switch (problem) {
    case "too_few_legs":
      return t.split.tooFewLegs(minLegs);
    case "too_many_legs":
      return t.split.tooManyLegs(maxLegs);
    case "leg_too_small":
      return t.split.legTooSmall(formatPrice(minLeg));
    case "sum_mismatch":
      return t.split.sumMismatch(formatPrice(state.unassigned));
    case "unknown_method":
      return t.split.unknownMethod;
    default:
      return null;
  }
}

/**
 * The split method's form. Each part has a method and an amount (the last part takes the rest);
 * the server prices the plan, and each part's method brings its own form (a card form for a card
 * part), charged what the quote says that part costs.
 *
 * @param lookup Finds the provider of a part's method. The registry passes its own.
 */
export function createSplitPaymentForm(lookup: ProviderLookup) {
  return function SplitPaymentForm({ method, cart, amount: total, guest, getPayer, register, placeOrder, onError }: PaymentFormProps) {
    const hp = useHeadpress();
    const formatError = useFormatError();
    const config = useCapability("split_payments");
    const methods = useQuery({ queryKey: ["payment-methods"], queryFn: () => hp.checkout.paymentMethods() });
    const legMethods = useMemo(
      () => splitLegMethods(methods.data ?? [], cart, config, lookup),
      [methods.data, cart, config],
    );
    const [state, actions] = useSplitBuilder({ total, legs: defaultLegs(total, legMethods) });

    const minLegs = Math.max(config?.min_legs ?? 2, 2);
    const maxLegs = Math.max(config?.max_legs ?? 2, minLegs);
    const minLeg = money(config?.min_leg_amount ?? 0, total.currency, total.minorUnit);

    // The plan follows the cart: a new coupon or shipping rate changes what there is to divide.
    const totalAmount = total.amount;
    useEffect(() => {
      if (state.total.amount === totalAmount) return;
      actions.setTotal(total);
      actions.setLegs(withRemainder(total, state.legs));
      // `total` is rebuilt on every cart read; its amount is what matters.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount]);

    // The methods may arrive after the first render; the first plan waits for them.
    const { setLegs } = actions;
    useEffect(() => {
      if (state.legs.length === 0 && legMethods.length >= 2) setLegs(defaultLegs(total, legMethods));
      // Only the arrival of the methods matters here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [legMethods]);

    // Each part's form registers here, by position.
    const legHandles = useRef<(PaymentFormHandle | null)[]>([]);
    const legRegisters = useMemo(
      () =>
        Array.from({ length: maxLegs }, (_, index) => (handle: PaymentFormHandle | null) => {
          legHandles.current[index] = handle;
        }),
      [maxLegs],
    );

    const latest = useRef({ state, minLegs, maxLegs, minLeg });
    useEffect(() => {
      latest.current = { state, minLegs, maxLegs, minLeg };
    });

    useEffect(() => {
      register({
        submit: async () => {
          const current = latest.current;
          const problem = problemMessage(current.state, current.minLegs, current.maxLegs, current.minLeg);
          if (problem) throw new PaymentError(problem);
          if (current.state.status !== "ready" || !current.state.quote) throw new PaymentError(t.split.notReady);

          const legs = [];
          for (const [index, leg] of current.state.legs.entries()) {
            const handle = legHandles.current[index];
            const submission = handle ? await handle.submit() : [];
            if (submission === null) return null;
            const paymentData: PaymentData = isSplitPlan(submission) ? [] : submission;
            // The amount before the discount: Headpress takes each method's discount off itself.
            legs.push({ gatewayId: leg.gatewayId, amount: leg.amount, paymentData: paymentData.length ? paymentData : undefined });
          }
          return { splitLegs: legs };
        },
      });
      return () => register(null);
    }, [method.id, register]);

    const changeAmount = (index: number, amount: number) => {
      const legs = state.legs.map((leg, position) =>
        position === index ? { ...leg, amount: money(amount, total.currency, total.minorUnit) } : leg,
      );
      actions.setLegs(withRemainder(total, legs));
    };

    const addLeg = () => {
      const used = new Set(state.legs.map((leg) => leg.gatewayId));
      const next = legMethods.find((entry) => !used.has(entry.id)) ?? legMethods[0];
      if (!next) return;
      // The new part starts empty and the last part keeps the rest.
      const legs = [...state.legs];
      legs.splice(legs.length - 1, 0, { gatewayId: next.id, amount: money(0, total.currency, total.minorUnit) });
      actions.setLegs(withRemainder(total, legs));
    };

    const removeLeg = (index: number) =>
      actions.setLegs(withRemainder(total, state.legs.filter((_, position) => position !== index)));

    const problem = problemMessage(state, minLegs, maxLegs, minLeg);
    const quote = state.quote;

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{t.split.description}</p>

        <ol className="flex flex-col gap-3">
          {state.legs.map((leg, index) => {
            const legMethod: PaymentMethod | undefined = legMethods.find((entry) => entry.id === leg.gatewayId);
            const priced = quote?.legs[index];
            const Form = legMethod ? lookup(legMethod)?.Form : undefined;
            const last = index === state.legs.length - 1;
            return (
              <li key={index} className="flex flex-col gap-3 rounded-control border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t.split.partTitle(index + 1)}</h3>
                  {state.legs.length > minLegs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.split.removePart(index + 1)}
                      onClick={() => removeLeg(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t.split.method}>
                    <Select value={leg.gatewayId} onChange={(event) => actions.setLeg(index, { gatewayId: event.target.value })}>
                      {legMethods.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {last ? (
                    <Field label={t.split.amount} hint={t.split.remainder}>
                      <Input value={formatPrice(leg.amount)} readOnly tabIndex={-1} className="bg-sunken" />
                    </Field>
                  ) : (
                    <Field label={t.split.amount}>
                      <AmountInput
                        key={leg.amount.amount}
                        value={leg.amount}
                        onCommit={(amount) => changeAmount(index, amount)}
                      />
                    </Field>
                  )}
                </div>
                {priced ? (
                  <p className="flex flex-wrap gap-x-4 text-xs text-ink-muted">
                    {priced.discount.amount > 0 ? (
                      <span className="text-success">{t.split.discount(formatPrice(priced.discount))}</span>
                    ) : null}
                    <span>{t.split.charged(formatPrice(priced.charge))}</span>
                  </p>
                ) : null}
                {legMethod && Form ? (
                  <Form
                    // A new method for this part is a new form.
                    key={`${index}-${legMethod.id}`}
                    method={legMethod}
                    cart={cart}
                    amount={priced?.charge ?? leg.amount}
                    guest={guest}
                    getPayer={getPayer}
                    register={legRegisters[index] ?? (() => undefined)}
                    placeOrder={placeOrder}
                    onError={onError}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        {state.legs.length < maxLegs ? (
          <Button type="button" variant="secondary" className="self-start" onClick={addLeg}>
            <Plus aria-hidden />
            {t.split.addPart}
          </Button>
        ) : null}

        {problem ? <Alert tone="warning">{problem}</Alert> : null}
        {state.error ? <Alert tone="danger">{formatError(state.error)}</Alert> : null}
        {state.status === "quoting" ? <p className="text-xs text-ink-muted">{t.split.quoting}</p> : null}

        {quote ? (
          <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            {quote.discountTotal.amount > 0 ? (
              <div className="flex justify-between text-success">
                <dt>{t.split.totalDiscount}</dt>
                <dd>−{formatPrice(quote.discountTotal)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between font-medium">
              <dt>{t.split.totalCharged}</dt>
              <dd>{formatPrice(quote.chargeTotal)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    );
  };
}
