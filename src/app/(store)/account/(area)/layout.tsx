import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/layout";
import { AccountShell } from "@/features/account/components/AccountShell";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.account.title, robots: { index: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10">
      <AccountShell>{children}</AccountShell>
    </Container>
  );
}
