import "server-only";

/** Server-only secrets. Importing this file from client code fails the build. */
export const serverEnv = {
  headpressSecretKey: process.env.HEADPRESS_SECRET_KEY || undefined,
  headpressWebhookSecret: process.env.HEADPRESS_WEBHOOK_SECRET || undefined,
  /** `log` accepts emails without sending them (development); `resend` sends through Resend. */
  emailProvider: process.env.EMAIL_PROVIDER === "resend" ? "resend" : "log",
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  /** `Store name <orders@example.com>`, on a domain verified at the provider. */
  emailFrom: process.env.EMAIL_FROM || undefined,
  emailReplyTo: process.env.EMAIL_REPLY_TO || undefined,
  /** Absolute URL of a PNG or JPEG logo for the email header. */
  emailLogoUrl: process.env.EMAIL_LOGO_URL || undefined,
} as const;
