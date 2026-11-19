import "server-only";

import { render } from "@react-email/components";

import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { readOr } from "@/lib/headpress/safe-read";

import type { EmailBrand } from "./brand";
import type { EmailTemplate } from "./define";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** The store's name from Headpress, so the emails follow the WordPress settings. */
export async function emailBrand(): Promise<EmailBrand> {
  const name = await readOr(siteConfig.name, async (hp) => (await hp.config.get()).store.name || siteConfig.name);
  return { name, url: publicEnv.siteUrl, logoUrl: serverEnv.emailLogoUrl ?? null };
}

export async function renderEmail(template: EmailTemplate, data: unknown, brand: EmailBrand): Promise<RenderedEmail> {
  const element = template.render(data, brand);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: template.subject(data, brand), html: finishHtml(html), text };
}

/**
 * React 19 moves `<meta name="viewport">` out of `<head>` and adds a `<link rel="preload">` for
 * every image. Email clients need the first and have no use for the second.
 */
export function finishHtml(html: string): string {
  return html
    .replace(/<link rel="preload" as="image"[^>]*\/?>/g, "")
    .replace("<head>", '<head><meta name="viewport" content="width=device-width, initial-scale=1"/>');
}
