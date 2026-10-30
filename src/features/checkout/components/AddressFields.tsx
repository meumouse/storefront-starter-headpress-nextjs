"use client";

import { maskDocument } from "@meumouse.com/headpress/br";
import type { AddressFormActions, AddressFormState } from "@meumouse.com/headpress/controllers";

import { Field, Input, Select } from "@/components/ui/field";
import { t } from "@/i18n";

const BRAZILIAN_STATES = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");

function errorText(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return code === "required" ? t.checkout.fieldRequired : t.checkout.fieldInvalid;
}

export function AddressFields({
  state,
  actions,
  showDocument = true,
}: {
  state: AddressFormState;
  actions: AddressFormActions;
  showDocument?: boolean;
}) {
  const { values, fieldErrors, lookup } = state;

  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label={t.checkout.firstName} error={errorText(fieldErrors.first_name)} className="sm:col-span-3">
        <Input
          autoComplete="given-name"
          value={values.first_name ?? ""}
          onChange={(event) => actions.set({ first_name: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.lastName} error={errorText(fieldErrors.last_name)} className="sm:col-span-3">
        <Input
          autoComplete="family-name"
          value={values.last_name ?? ""}
          onChange={(event) => actions.set({ last_name: event.target.value })}
        />
      </Field>
      {showDocument ? (
        <Field label={t.checkout.document} error={errorText(fieldErrors.document)} className="sm:col-span-3">
          <Input
            inputMode="numeric"
            value={values.document ?? ""}
            onChange={(event) => actions.set({ document: maskDocument(event.target.value) })}
          />
        </Field>
      ) : null}
      <Field
        label={t.checkout.postcode}
        error={errorText(fieldErrors.postcode)}
        hint={lookup === "not_found" ? t.checkout.postcodeNotFound : undefined}
        className="sm:col-span-3"
      >
        <Input
          inputMode="numeric"
          autoComplete="postal-code"
          value={values.postcode ?? ""}
          onChange={(event) => actions.set({ postcode: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.street} error={errorText(fieldErrors.address_1)} className="sm:col-span-4">
        <Input
          autoComplete="address-line1"
          value={values.address_1 ?? ""}
          onChange={(event) => actions.set({ address_1: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.number} error={errorText(fieldErrors.number)} className="sm:col-span-2">
        <Input value={values.number ?? ""} onChange={(event) => actions.set({ number: event.target.value })} />
      </Field>
      <Field label={t.checkout.complement} className="sm:col-span-3">
        <Input
          autoComplete="address-line2"
          value={values.address_2 ?? ""}
          onChange={(event) => actions.set({ address_2: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.neighborhood} error={errorText(fieldErrors.neighborhood)} className="sm:col-span-3">
        <Input
          value={values.neighborhood ?? ""}
          onChange={(event) => actions.set({ neighborhood: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.city} error={errorText(fieldErrors.city)} className="sm:col-span-4">
        <Input
          autoComplete="address-level2"
          value={values.city ?? ""}
          onChange={(event) => actions.set({ city: event.target.value })}
        />
      </Field>
      <Field label={t.checkout.state} error={errorText(fieldErrors.state)} className="sm:col-span-2">
        <Select value={values.state ?? ""} onChange={(event) => actions.set({ state: event.target.value })}>
          <option value="" />
          {BRAZILIAN_STATES.map((state_) => (
            <option key={state_} value={state_}>
              {state_}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
