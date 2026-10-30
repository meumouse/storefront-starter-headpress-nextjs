"use client";

import { useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { t } from "@/i18n";

function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
      {footer ? <div className="text-sm text-ink-muted">{footer}</div> : null}
    </Card>
  );
}

/** Runs one submission: pending state and the error text. */
function useSubmit() {
  const formatError = useFormatError();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, context?: string) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(formatError(failure, context));
    } finally {
      setPending(false);
    }
  };

  return { pending, error, run };
}

/** Only same-site paths: `next` comes from the URL, so it must not send the shopper away. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : paths.account;
}

export function LoginForm() {
  const hp = useHeadpress();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { pending, error, run } = useSubmit();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await hp.auth.login({ login, password });
      router.push(next);
      router.refresh();
    }, "login");
  };

  return (
    <AuthCard
      title={t.account.signInTitle}
      description={t.account.signInDescription}
      footer={
        <>
          {t.account.noAccount}{" "}
          <Link href={paths.register} className="text-brand hover:underline">
            {t.account.register}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t.account.email}>
          <Input
            type="email"
            autoComplete="username"
            required
            value={login}
            onChange={(event) => setLogin(event.target.value)}
          />
        </Field>
        <Field label={t.account.password}>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" loading={pending}>
          {t.account.signIn}
        </Button>
        <Link href={paths.forgotPassword} className="text-sm text-brand hover:underline">
          {t.account.forgotPassword}
        </Link>
      </form>
    </AuthCard>
  );
}

export function RegisterForm() {
  const hp = useHeadpress();
  const router = useRouter();
  const { pending, error, run } = useSubmit();
  const [values, setValues] = useState({ first_name: "", last_name: "", email: "", password: "" });

  const change = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await hp.auth.register(values);
      router.push(paths.account);
      router.refresh();
    }, "register");
  };

  return (
    <AuthCard
      title={t.account.registerTitle}
      description={t.account.registerDescription}
      footer={
        <>
          {t.account.hasAccount}{" "}
          <Link href={paths.login} className="text-brand hover:underline">
            {t.account.signIn}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.account.firstName}>
            <Input autoComplete="given-name" value={values.first_name} onChange={change("first_name")} />
          </Field>
          <Field label={t.account.lastName}>
            <Input autoComplete="family-name" value={values.last_name} onChange={change("last_name")} />
          </Field>
        </div>
        <Field label={t.account.email}>
          <Input type="email" autoComplete="email" required value={values.email} onChange={change("email")} />
        </Field>
        <Field label={t.account.password} hint={t.account.passwordHint}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={change("password")}
          />
        </Field>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" loading={pending}>
          {t.account.register}
        </Button>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const hp = useHeadpress();
  const { pending, error, run } = useSubmit();
  const [login, setLogin] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await hp.auth.requestPasswordReset(login);
      setSent(true);
    });
  };

  return (
    <AuthCard
      title={t.account.forgotTitle}
      description={t.account.forgotDescription}
      footer={
        <Link href={paths.login} className="text-brand hover:underline">
          {t.account.backToSignIn}
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success">{t.account.forgotSent}</Alert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t.account.email}>
            <Input
              type="email"
              autoComplete="email"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" loading={pending}>
            {t.account.forgotSubmit}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const hp = useHeadpress();
  const params = useSearchParams();
  const { pending, error, run } = useSubmit();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const key = params.get("key");
  const login = params.get("login");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!key || !login) return;
    void run(async () => {
      await hp.auth.confirmPasswordReset({ login, key, password });
      setDone(true);
    });
  };

  return (
    <AuthCard
      title={t.account.resetTitle}
      footer={
        <Link href={paths.login} className="text-brand hover:underline">
          {t.account.backToSignIn}
        </Link>
      }
    >
      {!key || !login ? <Alert tone="danger">{t.account.resetInvalid}</Alert> : null}
      {done ? <Alert tone="success">{t.account.resetDone}</Alert> : null}
      {key && login && !done ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
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
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button type="submit" loading={pending}>
            {t.account.resetSubmit}
          </Button>
        </form>
      ) : null}
    </AuthCard>
  );
}
