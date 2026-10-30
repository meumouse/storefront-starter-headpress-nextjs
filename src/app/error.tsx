"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { t } from "@/i18n";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="flex flex-1 items-center justify-center">
      <EmptyState
        title={t.common.genericError}
        action={<Button onClick={reset}>{t.common.retry}</Button>}
      />
    </main>
  );
}
