import type { PayPalConfig } from "./config";

interface PayPalButtonsInstance {
  isEligible(): boolean;
  render(container: HTMLElement): Promise<void>;
  close?(): Promise<void>;
}

export interface PayPalSdk {
  FUNDING: { CARD: string; PAYPAL: string };
  Buttons(options: Record<string, unknown>): PayPalButtonsInstance;
}

/** Its own global, so it cannot collide with another `window.paypal` on the page. */
const SDK_NAMESPACE = "hpPayPalSdk";
const SDK_SCRIPT_ID = "hp-paypal-sdk";

/** Ad blockers often blackhole paypal.com, and the request then neither loads nor errors. */
const SCRIPT_TIMEOUT_MS = 15_000;

declare global {
  interface Window {
    hpPayPalSdk?: PayPalSdk;
  }
}

function sdkUrl({ clientId, intent, currency, locale, disableFunding }: PayPalConfig): string {
  const params = new URLSearchParams({
    "client-id": clientId,
    components: "buttons,funding-eligibility",
    currency,
    locale,
    intent,
  });
  if (disableFunding) params.set("disable-funding", disableFunding);
  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

let current: { src: string; promise: Promise<PayPalSdk> } | null = null;

/**
 * Load the PayPal JS SDK once per URL. Another URL replaces the script, since the SDK boots with one
 * set of parameters per page; a failed load is forgotten, so a retry starts over.
 */
export function loadPayPalSdk(config: PayPalConfig): Promise<PayPalSdk> {
  const src = sdkUrl(config);
  if (current?.src === src) return current.promise;

  const promise = new Promise<PayPalSdk>((resolve, reject) => {
    document.getElementById(SDK_SCRIPT_ID)?.remove();
    delete window.hpPayPalSdk;

    const script = document.createElement("script");
    const finish = () => {
      clearTimeout(timer);
      const sdk = window.hpPayPalSdk;
      if (sdk?.Buttons) {
        resolve(sdk);
      } else {
        script.remove();
        reject(new Error("PayPal script did not load."));
      }
    };
    const timer = setTimeout(finish, SCRIPT_TIMEOUT_MS);

    script.id = SDK_SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.dataset.namespace = SDK_NAMESPACE;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", finish, { once: true });
    document.body.appendChild(script);
  });

  current = { src, promise };
  promise.catch(() => {
    if (current?.promise === promise) current = null;
  });
  return promise;
}
