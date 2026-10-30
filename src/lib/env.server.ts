import "server-only";

/** Server-only secrets. Importing this file from client code fails the build. */
export const serverEnv = {
  headpressSecretKey: process.env.HEADPRESS_SECRET_KEY || undefined,
  headpressWebhookSecret: process.env.HEADPRESS_WEBHOOK_SECRET || undefined,
} as const;
