/**
 * `POST /api/emails/send`: the transactional emails Headpress hands over (module `emails`).
 *
 * Headpress decides when an email goes out and with which data; this route checks the signature,
 * renders the template (`src/features/emails`) and sends it. The answers follow the contract:
 * 2xx is final, 503 makes Headpress retry with the same idempotency key, any other 4xx is
 * permanent (a bridged `wp_mail()` then reports the failure to WordPress).
 *
 * The body carries personal data (recipients, names, addresses): the log keeps the template id and
 * the number of recipients, nothing else.
 */
import { verifyWebhookSignature, WebhookError } from "@meumouse.com/headpress/webhooks";
import { NextResponse } from "next/server";
import { z } from "zod";

import { emailTemplates } from "@/features/emails/registry";
import { emailBrand, renderEmail } from "@/features/emails/render";
import { sendEmail } from "@/features/emails/send";
import { serverEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

/** The largest body Headpress sends is a bridged `wp_mail()` with attachments (28 MB before base64). */
const MAX_BODY_BYTES = 40_000_000;

const addresses = z.array(z.string().email()).max(50);

const envelopeSchema = z.object({
  id: z.string().max(100).optional(),
  template: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  to: addresses.min(1),
  cc: addresses.optional(),
  bcc: addresses.optional(),
  reply_to: z.string().email().nullish(),
  idempotency_key: z.string().max(256).nullish(),
  tags: z.record(z.string()).default({}),
  attachments: z
    .array(z.object({ filename: z.string().min(1).max(255), content: z.string(), content_type: z.string().optional() }))
    .max(20)
    .optional(),
  data: z.unknown().optional(),
  example: z.boolean().optional(),
});

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(request: Request) {
  const secret = serverEnv.headpressWebhookSecret;
  if (!secret) return fail(503, "not_configured", "HEADPRESS_WEBHOOK_SECRET is not set on the storefront.");

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "too_large", "Body too large.");
  const raw = await request.text();

  try {
    await verifyWebhookSignature(
      {
        body: raw,
        timestamp: request.headers.get("x-headpress-timestamp"),
        signature: request.headers.get("x-headpress-signature"),
      },
      { secret },
    );
  } catch (error) {
    if (error instanceof WebhookError) return fail(401, "invalid_signature", "Invalid signature.");
    throw error;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "invalid_body", "The body is not JSON.");
  }

  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return fail(400, "invalid_body", "The body is not an email request.");
  const message = envelope.data;

  const template = emailTemplates.get(message.template);
  if (!template) return fail(404, "unknown_template", `No template ${message.template} on the storefront.`);

  const data = template.schema.safeParse(message.example ? template.example : message.data);
  if (!data.success) {
    console.warn(`[emails] ${template.id}: invalid data at`, data.error.issues.map((issue) => issue.path.join(".")));
    return fail(422, "invalid_data", "The data does not match the template.");
  }

  let email;
  try {
    email = await renderEmail(template, data.data, await emailBrand());
  } catch (error) {
    console.error(`[emails] ${template.id}: render failed`, error);
    return fail(500, "render_failed", "The template could not be rendered.");
  }

  const result = await sendEmail({
    template: template.id,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    replyTo: message.reply_to ?? null,
    // Test sends are a new message every time.
    idempotencyKey: message.example ? null : (message.idempotency_key ?? null),
    tags: message.tags,
    attachments: message.attachments,
    email,
  });

  if (!result.ok) {
    console.warn(`[emails] ${template.id}: ${result.code} (${result.retry ? "retry" : "permanent"})`);
    return fail(result.retry ? 503 : 422, result.code, result.message);
  }

  console.info(`[emails] ${template.id} ${result.status} (${message.to.length} recipient(s))`);
  return NextResponse.json({ status: result.status, id: result.id });
}
