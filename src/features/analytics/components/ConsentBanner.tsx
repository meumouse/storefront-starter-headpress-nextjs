"use client";

import type { Consent } from "@meumouse.com/headpress/analytics";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function ConsentBanner({ consent }: { consent: Consent }) {
  const decided = useSyncExternalStore(
    consent.subscribe,
    () => consent.get().decided,
    () => true,
  );

  if (decided) return null;

  const config = consent.config();
  const texts = config?.texts;
  const policyPath = config?.privacy_path;

  return (
    <aside
      aria-label={t.recovery.consentTitle}
      className="fixed inset-x-3 bottom-3 z-30 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-float sm:right-auto sm:max-w-md"
    >
      <p className="text-sm text-ink-muted">
        {texts?.message || t.recovery.consentMessage}{" "}
        {policyPath ? (
          <Link href={policyPath} className="text-brand hover:underline">
            {texts?.policy_link || t.recovery.consentPolicy}
          </Link>
        ) : null}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => consent.rejectAll()}>
          {texts?.reject_all || t.recovery.consentReject}
        </Button>
        <Button size="sm" onClick={() => consent.acceptAll()}>
          {texts?.accept_all || t.recovery.consentAccept}
        </Button>
      </div>
    </aside>
  );
}
