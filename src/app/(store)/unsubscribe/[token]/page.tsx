import type { Metadata } from "next";

import { Container, PageHeading } from "@/components/ui/layout";
import { t } from "@/i18n";
import { MessagePreferences } from "@/integrations/sellback/MessagePreferences";

export const metadata: Metadata = { title: t.recovery.preferencesTitle, robots: { index: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <Container className="flex max-w-xl flex-col gap-6 py-12">
      <PageHeading title={t.recovery.preferencesTitle} description={t.recovery.preferencesDescription} />
      <MessagePreferences token={token} />
    </Container>
  );
}
