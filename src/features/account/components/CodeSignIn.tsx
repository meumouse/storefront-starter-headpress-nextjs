"use client";

/**
 * Sign in, or sign up, with a one-time code (Headpress `passwordless` module). The channels come
 * from the store config: email always works, WhatsApp while Joinotify can deliver. When a phone
 * channel is down, Headpress names the fallback channels and the form offers them.
 */
import { useCapability, useFormatError, useOtpFlow } from "@meumouse.com/headpress/react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  label: string;
  recipientType: "email" | "phone";
}

function channelLabel(id: string, serverLabel?: string): string {
  if (id === "email") return t.signIn.channelEmail;
  if (id === "whatsapp") return t.signIn.channelWhatsapp;
  return serverLabel || id;
}

/** The channels the store can deliver codes through now. */
export function useCodeChannels(): Channel[] {
  const config = useCapability("passwordless");
  return (config?.channels ?? [])
    .filter((channel) => typeof channel.id === "string" && channel.id)
    .map((channel) => ({
      id: channel.id as string,
      label: channelLabel(channel.id as string, channel.label),
      recipientType: channel.recipient_type === "phone" ? "phone" : "email",
    }));
}

/** Seconds until an epoch-millisecond moment, ticking every second. */
function useSecondsUntil(moment: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (moment === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [moment]);
  return moment === null ? 0 : Math.max(0, Math.ceil((moment - now) / 1000));
}

export function CodeSignIn({ onSignedIn }: { onSignedIn(): void }) {
  const formatError = useFormatError();
  const channels = useCodeChannels();
  const codeLength = useCapability("passwordless")?.code_length ?? 6;
  const [state, actions] = useOtpFlow();
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "email");
  const [recipient, setRecipient] = useState("");
  const [code, setCode] = useState("");
  const [details, setDetails] = useState({ email: "", first_name: "", last_name: "" });
  const resendSeconds = useSecondsUntil(state.resendAt);

  const channel = channels.find((entry) => entry.id === channelId) ?? channels[0];

  useEffect(() => {
    if (state.step === "signed_in") onSignedIn();
  }, [state.step, onSignedIn]);

  if (!channel) return null;

  const send = (event: FormEvent) => {
    event.preventDefault();
    void actions.start({ channel: channel.id, recipient: recipient.trim() });
  };

  const verify = (value: string) => {
    if (value.length === codeLength) void actions.verify(value);
  };

  const switchChannel = (id: string) => {
    setChannelId(id);
    setRecipient("");
    actions.reset();
  };

  const error = state.error ? <Alert tone="danger">{formatError(state.error, "login")}</Alert> : null;

  if (state.step === "needs_registration" || state.step === "registering") {
    const askEmail = channel.recipientType !== "email";
    const register = (event: FormEvent) => {
      event.preventDefault();
      void actions.register({
        email: askEmail ? details.email.trim() : state.recipient,
        first_name: details.first_name.trim() || undefined,
        last_name: details.last_name.trim() || undefined,
      });
    };
    const change = (key: keyof typeof details) => (event: { target: { value: string } }) =>
      setDetails((previous) => ({ ...previous, [key]: event.target.value }));

    return (
      <form onSubmit={register} className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">{t.signIn.registerTitle}</h2>
          <p className="text-sm text-ink-muted">{t.signIn.registerDescription}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.account.firstName}>
            <Input autoComplete="given-name" value={details.first_name} onChange={change("first_name")} />
          </Field>
          <Field label={t.account.lastName}>
            <Input autoComplete="family-name" value={details.last_name} onChange={change("last_name")} />
          </Field>
        </div>
        {askEmail ? (
          <Field label={t.account.email}>
            <Input type="email" autoComplete="email" required value={details.email} onChange={change("email")} />
          </Field>
        ) : null}
        {error}
        <Button type="submit" loading={state.step === "registering"}>
          {t.signIn.registerSubmit}
        </Button>
      </form>
    );
  }

  if (state.challenge && (state.step === "code_sent" || state.step === "verifying" || state.step === "signed_in")) {
    const noResend = state.resendAt === null;
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          verify(code);
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-ink-muted">{t.signIn.codeSent(state.challenge.masked_recipient)}</p>
        <Field label={t.signIn.codeLabel} hint={t.signIn.codeHint(codeLength)}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={codeLength}
            className="text-center font-mono text-xl tracking-[0.5em]"
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, codeLength);
              setCode(digits);
              verify(digits);
            }}
          />
        </Field>
        {error}
        <Button type="submit" loading={state.step === "verifying" || state.step === "signed_in"}>
          {t.signIn.verify}
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto px-0"
            disabled={noResend || resendSeconds > 0}
            onClick={() => {
              setCode("");
              void actions.resend();
            }}
          >
            {noResend ? t.signIn.noResend : resendSeconds > 0 ? t.signIn.resendIn(resendSeconds) : t.signIn.resend}
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0"
            onClick={() => {
              setCode("");
              actions.reset();
            }}
          >
            {t.signIn.changeRecipient}
          </Button>
        </div>
      </form>
    );
  }

  const fallbacks = channels.filter((entry) => state.fallbackChannels.includes(entry.id));

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      {channels.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t.signIn.channelLabel}</legend>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((entry) => (
              <label
                key={entry.id}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-control border border-line-strong px-3 py-2 text-sm transition-colors has-checked:border-brand has-checked:bg-brand-soft has-checked:font-medium",
                )}
              >
                <input
                  type="radio"
                  name="code-channel"
                  className="sr-only"
                  checked={entry.id === channel.id}
                  onChange={() => switchChannel(entry.id)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {channel.recipientType === "phone" ? (
        <Field label={t.signIn.recipientPhone} hint={t.signIn.recipientPhoneHint}>
          <Input
            type="tel"
            autoComplete="tel"
            required
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </Field>
      ) : (
        <Field label={t.signIn.recipientEmail}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </Field>
      )}
      {error}
      {fallbacks.map((entry) => (
        <Button key={entry.id} type="button" variant="secondary" onClick={() => switchChannel(entry.id)}>
          {t.signIn.useFallback(entry.label)}
        </Button>
      ))}
      <Button type="submit" loading={state.step === "sending"}>
        {t.signIn.sendCode}
      </Button>
    </form>
  );
}
