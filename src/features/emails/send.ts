import "server-only";

import { serverEnv } from "@/lib/env.server";

import type { RenderedEmail } from "./render";

export interface SendInput {
  template: string;
  to: readonly string[];
  cc?: readonly string[];
  bcc?: readonly string[];
  replyTo: string | null;
  /** Headpress keeps it across its retries; the provider uses it to send once. */
  idempotencyKey: string | null;
  tags: Record<string, string>;
  attachments?: readonly { filename: string; content: string; content_type?: string }[];
  email: RenderedEmail;
}

/** `retry`: worth trying again later (rate limit, outage, a setting a fix within the hour solves). */
export type SendResult =
  | { ok: true; status: "sent" | "logged"; id: string }
  | { ok: false; retry: boolean; code: string; message: string };

/** Resend's `tags` accept ASCII letters, digits, `_` and `-`. */
function tagList(template: string, tags: Record<string, string>) {
  const clean = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);
  return Object.entries({ template, ...tags }).map(([name, value]) => ({ name: clean(name), value: clean(value) }));
}

async function sendWithResend(input: SendInput): Promise<SendResult> {
  const apiKey = serverEnv.resendApiKey;
  if (!apiKey || !serverEnv.emailFrom) {
    return { ok: false, retry: true, code: "not_configured", message: "RESEND_API_KEY and EMAIL_FROM must be set" };
  }

  try {
    // Resend's HTTP API, so swapping the provider is one function and no SDK.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: serverEnv.emailFrom,
        to: input.to,
        cc: input.cc?.length ? input.cc : undefined,
        bcc: input.bcc?.length ? input.bcc : undefined,
        reply_to: input.replyTo || serverEnv.emailReplyTo || undefined,
        subject: input.email.subject,
        html: input.email.html,
        text: input.email.text,
        tags: tagList(input.template, input.tags),
        attachments: input.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
          content_type: file.content_type,
        })),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };

    if (response.ok) return { ok: true, status: "sent", id: body.id ?? "" };
    // 401/403 are a key problem a fix in the panel solves: Headpress should keep the message.
    const retry = response.status === 429 || response.status >= 500 || response.status === 401 || response.status === 403;
    return { ok: false, retry, code: body.name ?? `http_${response.status}`, message: body.message ?? response.statusText };
  } catch (error) {
    return { ok: false, retry: true, code: "provider_unreachable", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Send through the configured provider. `log` (the default) accepts and sends nothing. */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  if (serverEnv.emailProvider === "resend") return sendWithResend(input);
  return { ok: true, status: "logged", id: "" };
}
