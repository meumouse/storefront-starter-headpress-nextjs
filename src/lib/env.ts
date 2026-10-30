/**
 * Public environment variables, safe in the browser.
 *
 * `process.env.NEXT_PUBLIC_*` must be written out in full: Next.js inlines those exact expressions
 * at build time. Read them through this object everywhere else.
 */
export const publicEnv = {
  // Defaults to the mock WordPress, so a fresh clone builds and runs. `next.config.ts` warns about it.
  wpUrl: (process.env.NEXT_PUBLIC_WP_URL || "http://127.0.0.1:8787").replace(/\/+$/, ""),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  publishableKey: process.env.NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY || undefined,
  locale: process.env.NEXT_PUBLIC_STORE_LOCALE ?? "en",
} as const;
