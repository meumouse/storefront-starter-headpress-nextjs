"use client";

import { maskDate } from "@meumouse.com/headpress/br";

import { Field, Input, Select } from "@/components/ui/field";
import { t } from "@/i18n";

import type { BrazilianMarketRules, PersonalErrors, PersonalValues } from "../lib/brazilian-fields";

/** What the store's Brazilian Market setup requires beyond the address. Empty when it asks for nothing. */
export function PersonalFields({
  rules,
  values,
  errors,
  onChange,
}: {
  rules: BrazilianMarketRules | undefined;
  values: PersonalValues;
  errors: PersonalErrors;
  onChange(changes: Partial<PersonalValues>): void;
}) {
  if (!rules?.birthdate && !rules?.gender) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rules.birthdate ? (
        <Field label={t.checkout.birthdate} error={errors.birthdate ? t.checkout.fieldInvalid : undefined}>
          <Input
            inputMode="numeric"
            autoComplete="bday"
            value={values.birthdate}
            onChange={(event) => onChange({ birthdate: maskDate(event.target.value) })}
          />
        </Field>
      ) : null}
      {rules.gender ? (
        <Field label={t.checkout.gender} error={errors.gender ? t.checkout.fieldRequired : undefined}>
          <Select value={values.gender} onChange={(event) => onChange({ gender: event.target.value })}>
            <option value="" />
            <option value="F">{t.checkout.genderFemale}</option>
            <option value="M">{t.checkout.genderMale}</option>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
