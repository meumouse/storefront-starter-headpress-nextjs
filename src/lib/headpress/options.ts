import type { HeadpressOptions } from "@meumouse.com/headpress";
import { nextCache } from "@meumouse.com/headpress/next";

import { sdkMessages, storeLocale } from "@/i18n";
import { publicEnv } from "@/lib/env";

/** Plugins every client carries. `nextCache()` tags public reads and leaves personal ones out. */
export const clientPlugins = [nextCache()] as const;

/** Options shared by the browser and server clients. */
export function clientOptions(): HeadpressOptions<typeof clientPlugins> {
  return {
    baseUrl: publicEnv.wpUrl,
    publishableKey: publicEnv.publishableKey,
    locale: storeLocale,
    messages: [sdkMessages],
    plugins: clientPlugins,
    timeoutMs: 15_000,
  };
}
