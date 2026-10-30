/**
 * Consent, tracking and order attribution, all from the SDK. The tracker holds every event until
 * the shopper decides, and tags load only for the categories they allow.
 */
import type { HeadpressClient, StoreConfig } from "@meumouse.com/headpress";
import {
  browserIds,
  checkoutAttribution,
  checkoutConsent,
  createAttribution,
  createConsent,
  createRelay,
  createTracker,
  providersFromConfig,
  recordConsent,
  type Attribution,
  type Consent,
  type Tracker,
} from "@meumouse.com/headpress/analytics";

export interface Analytics {
  consent: Consent;
  tracker: Tracker;
  attribution: Attribution;
}

let analytics: Analytics | null = null;

/** The page's analytics, created once when the store config is known. Browser only. */
export function initAnalytics(hp: HeadpressClient, config: StoreConfig): Analytics {
  if (analytics) return analytics;

  const consent = createConsent({ config: () => hp.capabilities.get("consent") });
  consent.subscribe((state) => void recordConsent(hp, state));

  analytics = {
    consent,
    tracker: createTracker({
      consent,
      providers: providersFromConfig(config, { load: true }),
      relay: createRelay(hp),
      currency: config.commerce?.currency.code,
    }),
    attribution: createAttribution(),
  };
  return analytics;
}

/** Null until the config arrives, and on the server. Callers skip tracking then. */
export function getAnalytics(): Analytics | null {
  return analytics;
}

/** What `hp.checkout.place()` takes for the order's attribution and the consent proof. */
export function checkoutTrackingFields(config: StoreConfig | null) {
  if (!analytics) return {};
  const state = analytics.consent.get();
  return {
    attribution:
      checkoutAttribution(analytics.attribution, browserIds(state), {
        woocommerce: config?.modules.woocommerce,
        consent: state,
      }) ?? undefined,
    consent: checkoutConsent(state),
  };
}
