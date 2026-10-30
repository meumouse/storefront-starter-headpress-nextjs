/**
 * Cielo's scripts in the browser: the Silent Order Post (tokenization) and the 3DS 2.0 MPI
 * (authentication).
 *
 * Both read the card from DOM fields by class (`bp-sop-*`, `bpmpi_*`). Those fields are created here,
 * outside React, and removed when done: the MPI deletes its token field from the page on load, which
 * would break a field React controls.
 */
import { PaymentError } from "@/features/checkout/payments/types";
import { t } from "@/i18n";

import type { CieloCardKind, CieloSopResult, CieloThreeDsEvent, CieloThreeDsResult, CieloThreeDsToken } from "./card";

declare global {
  interface Window {
    bpSop_silentOrderPost?: (options: Record<string, unknown>) => void;
    bpmpi_config?: () => Record<string, unknown>;
    bpmpi_authenticate?: () => void;
  }
}

const scriptError = () => new PaymentError(t.checkout.cieloScriptFailed);

const loaded = new Map<string, Promise<void>>();

/** Load a script once per page; a failed load can be tried again. */
function loadScriptOnce(src: string): Promise<void> {
  let promise = loaded.get(src);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        reject(scriptError());
      };
      document.head.appendChild(script);
    }).catch((error) => {
      loaded.delete(src);
      throw error;
    });
    loaded.set(src, promise);
  }
  return promise;
}

/** Hidden fields the scripts read by class; returns what removes them. */
function mountFields(fields: Record<string, string>): () => void {
  const box = document.createElement("div");
  box.hidden = true;
  box.setAttribute("aria-hidden", "true");
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.className = name;
    input.value = value;
    box.appendChild(input);
  }
  document.body.appendChild(box);
  return () => box.remove();
}

/** Tokenize the card with the Silent Order Post: the single-use `PaymentToken`, brand and last digits. */
export async function tokenizeCieloCard({
  accessToken,
  environment,
  scriptUrl,
  kind,
  card,
}: {
  accessToken: string;
  environment: "sandbox" | "production";
  scriptUrl: string;
  kind: CieloCardKind;
  card: { number: string; holder: string; month: string; year: string; cvv: string };
}): Promise<CieloSopResult> {
  await loadScriptOnce(scriptUrl);

  const tokenize = window.bpSop_silentOrderPost;
  if (!tokenize) throw scriptError();

  const unmount = mountFields({
    "bp-sop-cardholdername": card.holder,
    "bp-sop-cardnumber": card.number,
    "bp-sop-cardexpirationdate": `${card.month}/${card.year}`,
    // Cielo's docs say `bp-sop-cardcvvc`, but the script reads `bp-sop-cardcvv`.
    "bp-sop-cardcvv": card.cvv,
    ...(kind === "debit" ? { "bp-sop-cardtype": "debitCard" } : {}),
  });

  try {
    return await new Promise<CieloSopResult>((resolve, reject) => {
      tokenize({
        accessToken,
        environment,
        language: "PT",
        enableBinQuery: true,
        onSuccess: (result: CieloSopResult) => {
          if (result?.PaymentToken) resolve(result);
          else reject(new PaymentError(t.checkout.cieloNotValidated));
        },
        onInvalid: () => reject(new PaymentError(t.checkout.cieloRejected)),
        onError: () => reject(new PaymentError(t.checkout.cieloValidationError)),
      });
    });
  } finally {
    unmount();
  }
}

/** Time for the script to get ready, and in total (the bank's challenge can take minutes). */
const READY_TIMEOUT = 30_000;
const TOTAL_TIMEOUT = 10 * 60_000;

/**
 * Authenticate the card with the 3DS 2.0 MPI and return its final event. The script runs again for
 * every authentication: it reads the token only when it loads and keeps its state inside. It always
 * loads from Cielo's server: it has an integrity check, so no local copy.
 */
export async function authenticateCieloCard({
  token,
  fields,
}: {
  token: CieloThreeDsToken;
  /** `bpmpi_*` fields (`cieloThreeDsFields`), with the token in `bpmpi_accesstoken`. */
  fields: Record<string, string>;
}): Promise<{ event: CieloThreeDsEvent; result: CieloThreeDsResult | null }> {
  const unmount = mountFields(fields);
  let script: HTMLScriptElement | null = null;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  let totalTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await new Promise((resolve, reject) => {
      let ready = false;
      const finish = (event: CieloThreeDsEvent) => (result?: CieloThreeDsResult) =>
        resolve({ event, result: result ?? null });
      const timeout = () =>
        resolve({ event: "onError", result: { ReturnCode: "TIMEOUT", ReturnMessage: "3DS timeout" } });

      window.bpmpi_config = () => ({
        onReady: () => {
          ready = true;
          clearTimeout(readyTimer);
          window.bpmpi_authenticate?.();
        },
        onSuccess: finish("onSuccess"),
        onFailure: finish("onFailure"),
        onUnenrolled: finish("onUnenrolled"),
        onDisabled: finish("onDisabled"),
        onError: finish("onError"),
        onUnsupportedBrand: finish("onUnsupportedBrand"),
        // A suppressed challenge is never asked for, but it must end the wait.
        onChallengeSuppression: finish("onError"),
        Environment: token.environment,
        Debug: false,
      });

      readyTimer = setTimeout(() => {
        if (!ready) timeout();
      }, READY_TIMEOUT);
      totalTimer = setTimeout(timeout, TOTAL_TIMEOUT);

      script = document.createElement("script");
      script.src = token.script_url;
      script.async = true;
      script.onerror = () => reject(scriptError());
      document.head.appendChild(script);
    });
  } finally {
    clearTimeout(readyTimer);
    clearTimeout(totalTimer);
    (script as HTMLScriptElement | null)?.remove();
    unmount();
  }
}
