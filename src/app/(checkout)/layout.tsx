import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { t } from "@/i18n";
import { safeRead } from "@/lib/headpress/safe-read";

/** Checkout without the store's navigation: fewer ways out of the purchase. */
export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const config = await safeRead((hp) => hp.config.get());

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="flex h-16 items-center justify-between">
          <Link href={paths.home} className="text-lg font-semibold tracking-tight">
            {config.ok ? config.data.store.name : siteConfig.name}
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <Lock className="size-4" aria-hidden />
            {t.checkout.secure}
          </span>
        </Container>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
