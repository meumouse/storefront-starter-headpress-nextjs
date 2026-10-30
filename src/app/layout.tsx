import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StoreProviders } from "@/components/layout/StoreProviders";
import { siteConfig } from "@/config/site";
import { storeLocale, t } from "@/i18n";
import { publicEnv } from "@/lib/env";
import { safeRead } from "@/lib/headpress/safe-read";

import "@/styles/globals.css";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const config = await safeRead((hp) => hp.config.get());
  const name = config.ok ? config.data.store.name : siteConfig.name;

  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: name, template: `%s | ${name}` },
    description: config.ok ? config.data.store.description : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await safeRead((hp) => hp.config.get());

  return (
    <html lang={storeLocale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-control focus:bg-surface focus:p-2"
        >
          {t.common.skipToContent}
        </a>
        <StoreProviders config={config.ok ? config.data : null}>{children}</StoreProviders>
      </body>
    </html>
  );
}
