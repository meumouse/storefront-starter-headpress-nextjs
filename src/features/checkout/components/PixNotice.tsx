import { t } from "@/i18n";

/** Pix needs nothing at checkout: the code comes back with the order. */
export function PixNotice() {
  return <p className="text-sm text-ink-muted">{t.checkout.pixCheckout}</p>;
}
