import type { Metadata } from "next";

import { Container } from "@/components/ui/layout";
import { t } from "@/i18n";
import { CartRecovery } from "@/integrations/sellback/CartRecovery";

export const metadata: Metadata = { title: t.recovery.restoringTitle, robots: { index: false } };

export default async function CartRecoveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sbm?: string }>;
}) {
  const { token } = await params;
  const { sbm } = await searchParams;

  return (
    <Container>
      <CartRecovery token={token} messageId={Number(sbm) || 0} />
    </Container>
  );
}
