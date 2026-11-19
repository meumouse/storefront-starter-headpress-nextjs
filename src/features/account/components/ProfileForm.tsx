"use client";

import type { Customer } from "@meumouse.com/headpress";
import { useCapability, useCustomer, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/layout";
import { t } from "@/i18n";

import { GoogleSignInButton } from "./GoogleSignInButton";

function DetailsForm({
  firstName,
  lastName,
  onSaved,
}: {
  firstName: string;
  lastName: string;
  onSaved: () => Promise<void>;
}) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const [first_name, setFirstName] = useState(firstName);
  const [last_name, setLastName] = useState(lastName);

  const save = useMutation({
    mutationFn: async () => {
      await hp.customer.update({ first_name, last_name });
      await onSaved();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.account.firstName}>
            <Input value={first_name} onChange={(event) => setFirstName(event.target.value)} />
          </Field>
          <Field label={t.account.lastName}>
            <Input value={last_name} onChange={(event) => setLastName(event.target.value)} />
          </Field>
        </div>
        {save.error ? <Alert tone="danger">{formatError(save.error)}</Alert> : null}
        {save.isSuccess ? <Alert tone="success">{t.account.profileSaved}</Alert> : null}
        <Button type="submit" className="self-start" loading={save.isPending}>
          {t.common.save}
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const [current_password, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");

  const change = useMutation({
    mutationFn: () => hp.customer.changePassword({ password, current_password }),
    onSuccess: () => {
      setCurrentPassword("");
      setPassword("");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    change.mutate();
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.account.passwordTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.account.currentPassword}>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={current_password}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label={t.account.newPassword} hint={t.account.passwordHint}>
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </div>
        {change.error ? <Alert tone="danger">{formatError(change.error)}</Alert> : null}
        {change.isSuccess ? <Alert tone="success">{t.account.passwordSaved}</Alert> : null}
        <Button type="submit" variant="secondary" className="self-start" loading={change.isPending}>
          {t.account.passwordTitle}
        </Button>
      </form>
    </Card>
  );
}

/** Link a Google account to sign in with it, or unlink it. Hidden while the store has no Google sign-in. */
function GoogleAccountCard({ google, onChanged }: { google: Customer["google"]; onChanged: () => Promise<void> }) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const enabled = Boolean(useCapability("google_sign_in")?.client_id);
  const [message, setMessage] = useState<string | null>(null);

  const unlink = useMutation({
    mutationFn: async () => {
      await hp.customer.google.unlink();
      await onChanged();
    },
    onSuccess: () => setMessage(t.signIn.googleUnlinked),
  });

  if (!enabled) return null;

  const link = async (credential: string) => {
    await hp.customer.google.link(credential);
    await onChanged();
    setMessage(t.signIn.googleLinkedNow);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold">{t.signIn.googleTitle}</h2>
        <p className="text-sm text-ink-muted">
          {google?.linked ? t.signIn.googleLinked(google.email ?? "") : t.signIn.googleNotLinked}
        </p>
      </div>
      {google?.linked ? (
        <Button variant="secondary" className="self-start" loading={unlink.isPending} onClick={() => unlink.mutate()}>
          {t.signIn.googleUnlink}
        </Button>
      ) : (
        <div className="max-w-xs">
          <GoogleSignInButton text="continue_with" onCredential={link} />
        </div>
      )}
      {unlink.error ? <Alert tone="danger">{formatError(unlink.error)}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}

export function ProfileForm() {
  const { customer, reload } = useCustomer();
  if (!customer) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t.account.profileTitle}</h1>
      <DetailsForm firstName={customer.first_name} lastName={customer.last_name} onSaved={reload} />
      <GoogleAccountCard google={customer.google} onChanged={reload} />
      <PasswordForm />
    </div>
  );
}
