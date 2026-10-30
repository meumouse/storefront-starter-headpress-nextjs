"use client";

import { useHeadpress } from "@meumouse.com/headpress/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import type { PaymentFormProps } from "@/features/checkout/payments/types";
import { t } from "@/i18n";

import { createPayPalOrder, reportPayPalError } from "./api";
import { toPayPalConfig } from "./config";
import { loadPayPalSdk } from "./sdk";

/** Thrown when the checkout is not ready, so PayPal's window closes without an error message. */
class CheckoutNotReady extends Error {}

/**
 * The PayPal wallet and card buttons. The whole payment lives in PayPal's iframes:
 *
 *   1. on click, the plugin creates the order from the cart;
 *   2. PayPal approves it (3-D Secure included);
 *   3. the Store API checkout captures it with `paypal_order_id`.
 *
 * The server checks the amount before capturing. An approved order cannot be paid twice, so a
 * refused one redraws the button for a new attempt.
 */
export function PayPalButtons({ method, cart, getPayer, placeOrder, onError }: PaymentFormProps) {
  const hp = useHeadpress();
  const config = toPayPalConfig(method.config);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "ineligible" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  // PayPal keeps the callbacks from the first render; these always read the latest ones.
  const latest = useRef({ getPayer, placeOrder, onError });
  useEffect(() => {
    latest.current = { getPayer, placeOrder, onError };
  });

  const flow = config?.flow;
  const clientId = config?.clientId;
  const total = cart.totals.total.amount;

  useEffect(() => {
    if (!config) return;

    let cancelled = false;
    let close: (() => void) | undefined;

    void (async () => {
      try {
        const sdk = await loadPayPalSdk(config);
        const container = containerRef.current;
        if (cancelled || !container) return;
        container.innerHTML = "";

        const buttons = sdk.Buttons({
          fundingSource: config.flow === "card" ? sdk.FUNDING.CARD : sdk.FUNDING.PAYPAL,
          style: { layout: "vertical", shape: "rect", tagline: false },
          createOrder: async () => {
            const payer = latest.current.getPayer();
            if (!payer) throw new CheckoutNotReady();
            return createPayPalOrder(hp, config.flow, payer);
          },
          onApprove: async (data: { orderID?: string }) => {
            const placed = await latest.current.placeOrder([{ key: "paypal_order_id", value: String(data.orderID ?? "") }]);
            if (!placed && !cancelled) setAttempt((value) => value + 1);
          },
          onError: (error: unknown) => {
            if (error instanceof CheckoutNotReady) return;
            reportPayPalError(hp, "approval", error instanceof Error ? error.message : String(error));
            latest.current.onError(t.checkout.paypalGenericError);
          },
        });
        close = () => void buttons.close?.().catch(() => undefined);

        if (!buttons.isEligible()) {
          setStatus("ineligible");
          return;
        }

        await buttons.render(container);
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        reportPayPalError(hp, "script", error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      close?.();
    };
    // `config` is rebuilt on each render from the same method; the total redraws the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, flow, clientId, total, attempt]);

  if (!config) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">{t.checkout.paypalContinue}</p>
      {status === "loading" ? <Skeleton className="h-12" /> : null}
      {status === "ineligible" ? <p className="text-sm text-ink-muted">{t.checkout.paypalIneligible}</p> : null}
      {status === "error" ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-danger">{t.checkout.paypalLoadError}</p>
          <p className="text-sm text-ink-muted">{t.checkout.paypalLoadHint}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            {t.common.retry}
          </Button>
        </div>
      ) : null}
      {/* Never display:none, which sizes PayPal's iframes to zero. `isolate` keeps their high
          z-index inside this box, so dialogs still cover the buttons. */}
      <div ref={containerRef} className="isolate w-full" />
    </div>
  );
}
