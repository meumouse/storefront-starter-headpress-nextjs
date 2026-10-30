"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { storeLocale, t } from "@/i18n";

import type { PendingPayment } from "../payments/types";

function PixInstructions({ payment }: { payment: Extract<PendingPayment, { type: "pix" }> }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(payment.code);
    setCopied(true);
  };

  const expiresAt = payment.expiresAt
    ? new Date(payment.expiresAt).toLocaleString(storeLocale, { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-semibold">{t.checkout.pixTitle}</h2>
      <p className="max-w-sm text-sm text-ink-muted">{t.checkout.pixInstructions}</p>
      {/* The code is what the bank reads, so it is drawn here whatever image the gateway sends. */}
      <div className="rounded-card border border-line bg-white p-3">
        <QRCodeSVG value={payment.code} size={200} aria-label={t.checkout.pixTitle} />
      </div>
      <Button variant="secondary" onClick={copy}>
        {copied ? t.checkout.pixCopied : t.checkout.pixCopy}
      </Button>
      <code className="max-w-full rounded-control bg-sunken px-3 py-2 text-xs break-all">{payment.code}</code>
      {expiresAt ? <p className="text-xs text-ink-muted">{t.checkout.pixExpiresAt(expiresAt)}</p> : null}
    </div>
  );
}

export function PaymentInstructions({ payment }: { payment: PendingPayment }) {
  if (payment.type === "pix") return <PixInstructions payment={payment} />;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="font-semibold">{t.checkout.boletoTitle}</h2>
      <Button asChild>
        <a href={payment.url} target="_blank" rel="noreferrer">
          {t.checkout.boletoOpen}
        </a>
      </Button>
      {payment.barcode ? <code className="text-xs break-all">{payment.barcode}</code> : null}
    </div>
  );
}
