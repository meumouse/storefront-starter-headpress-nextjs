"use client";

import { useCart, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { t } from "@/i18n";

import { restoreCart } from "./api";

/** The page a recovery link opens: restores the cart, then goes to the checkout. */
export function CartRecovery({ token, messageId }: { token: string; messageId: number }) {
  const hp = useHeadpress();
  const router = useRouter();
  const formatError = useFormatError();
  const [, { load }] = useCart({ load: "never" });
  const [error, setError] = useState<string | null>(null);

  // A token works once: StrictMode's second effect must not spend it again.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    restoreCart(hp, token, messageId)
      .then(async (restored) => {
        if (restored?.payment_url) {
          window.location.assign(restored.payment_url);
          return;
        }
        await load();
        router.replace(paths.checkout);
      })
      .catch((failure: unknown) => setError(formatError(failure)));
  }, [hp, token, messageId, load, router, formatError]);

  if (error) {
    return (
      <EmptyState
        title={t.recovery.restoringFailed}
        description={error || t.recovery.restoringFailedDescription}
        action={
          <Button asChild>
            <Link href={paths.shop}>{t.cart.continueShopping}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex justify-center py-20">
      <Spinner label={t.recovery.restoringTitle} />
    </div>
  );
}
