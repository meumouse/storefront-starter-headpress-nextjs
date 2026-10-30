import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { Container } from "@/components/ui/layout";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.account.signInTitle, robots: { index: false } };

/** The forms read the query string, so they need a Suspense boundary to prerender. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-14">
      <Suspense>{children}</Suspense>
    </Container>
  );
}
