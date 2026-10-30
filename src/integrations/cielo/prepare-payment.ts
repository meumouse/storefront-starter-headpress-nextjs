/**
 * Prepare a Cielo card payment before the call that charges it:
 *
 * 1. tokenize the card with the Silent Order Post (official brand from the BIN lookup, or by the
 *    start of the number when the lookup is silent);
 * 2. check the installments for that brand and read the charged total, interest included;
 * 3. authenticate with the bank through 3DS, for that total;
 * 4. return the `payment_data`.
 *
 * Tokenizing before the 3DS stops an invalid card without bothering the bank; the `PaymentToken`
 * lasts 20 minutes, plenty for the challenge. Every attempt gets a new token and authentication.
 */
import type { HeadpressClient } from "@meumouse.com/headpress";

import { PaymentError, type Payer, type PaymentData } from "@/features/checkout/payments/types";
import { t } from "@/i18n";
import { onlyDigits } from "@/lib/utils";

import { fetchCieloInstallments, fetchCieloSopToken, fetchCieloThreeDsToken } from "./api";
import { authenticateCieloCard, tokenizeCieloCard } from "./browser";
import {
  brandLabel,
  cieloCardPaymentData,
  cieloThreeDsFields,
  cieloThreeDsOutcome,
  detectCieloBrand,
  normalizeCieloBrand,
  normalizeHolder,
  parseExpiry,
  type CieloCardConfig,
  type CieloCardValues,
  type CieloThreeDsResult,
} from "./card";

/** What the card will be charged, in minor units. */
async function chargedTotal(
  hp: Pick<HeadpressClient, "request">,
  config: CieloCardConfig,
  amount: number,
  brand: string,
  installments: number,
): Promise<number> {
  // Debit is one payment, with no plan to ask for.
  if (config.kind === "debit") return amount;

  const plan = await fetchCieloInstallments(hp, amount, brand || null);
  const option = plan.options.find((entry) => entry.installments === installments);
  if (!option) {
    throw new PaymentError(installments > 1 ? t.checkout.cieloNoInstallments(installments) : t.checkout.cieloNoUpfront);
  }
  return option.total;
}

export async function prepareCieloCardPayment({
  hp,
  config,
  card,
  amount,
  payer,
  guest,
}: {
  hp: Pick<HeadpressClient, "request">;
  config: CieloCardConfig;
  card: CieloCardValues;
  /** What the card pays, in minor units, without installment interest. */
  amount: number;
  payer: Payer;
  guest: boolean;
}): Promise<PaymentData> {
  const expiry = parseExpiry(card.expiry);
  if (!expiry) throw new PaymentError(t.checkout.cardExpiryInvalid);

  const installments = card.installments ?? 1;
  const digits = onlyDigits(card.number);
  const sopToken = await fetchCieloSopToken(hp);
  const tokenized = await tokenizeCieloCard({
    accessToken: sopToken.access_token,
    environment: sopToken.environment ?? config.environment,
    scriptUrl: sopToken.script_url || config.sopScriptUrl,
    kind: config.kind,
    card: {
      number: digits,
      holder: normalizeHolder(card.holder),
      month: expiry.month,
      year: expiry.year,
      cvv: onlyDigits(card.cvv),
    },
  });

  // The BIN lookup does not always answer (not enabled on the Cielo account, for one); then the
  // brand by the start of the number and the typed last digits stand in.
  const brand = normalizeCieloBrand(tokenized.Brand) ?? detectCieloBrand(digits) ?? "";
  const sop = { ...tokenized, Brand: brand, CardLast4Digits: tokenized.CardLast4Digits || digits.slice(-4) };

  if (brand && config.brands.length > 0 && !config.brands.includes(brand)) {
    throw new PaymentError(t.checkout.cardBrandRejected(brandLabel(brand)));
  }

  const total = await chargedTotal(hp, config, amount, brand, installments);
  let threeDs: CieloThreeDsResult | null = null;

  if (config.threeDs !== "off") {
    const token = await fetchCieloThreeDsToken(hp);
    const { event, result } = await authenticateCieloCard({
      token,
      fields: cieloThreeDsFields({
        token,
        kind: config.kind,
        orderNumber: `HP${Date.now()}`,
        totalAmount: total,
        installments,
        card,
        payer: {
          name: `${payer.firstName} ${payer.lastName}`,
          email: payer.email,
          phone: payer.phone,
          document: payer.document,
          street: payer.street,
          number: payer.number,
          complement: payer.complement,
          neighborhood: payer.neighborhood,
          city: payer.city,
          state: payer.state,
          zip: payer.postcode,
        },
        merchantUrl: window.location.origin,
        guest,
      }),
    });
    const outcome = cieloThreeDsOutcome(event, result, config.threeDs);
    if (!outcome.ok) throw new PaymentError(outcome.message);
    threeDs = outcome.result;
  }

  return cieloCardPaymentData({ config, sop, holder: card.holder, installments, threeDs, document: payer.document });
}
