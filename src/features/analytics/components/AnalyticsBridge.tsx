"use client";

import { useHeadpress, useStoreConfig } from "@meumouse.com/headpress/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import { isSellbackTokenPath } from "@/integrations/sellback/paths";

import { initAnalytics } from "../analytics";
import { ConsentBanner } from "./ConsentBanner";

/** Starts analytics, reports page views and shows the consent banner. */
export function AnalyticsBridge() {
  const hp = useHeadpress();
  const config = useStoreConfig();
  const pathname = usePathname();
  const analytics = useMemo(
    () => (config && typeof window !== "undefined" ? initAnalytics(hp, config) : null),
    [hp, config],
  );

  useEffect(() => {
    // A token in the URL must not reach page views or the order attribution.
    if (!analytics || isSellbackTokenPath(pathname)) return;
    analytics.attribution.capture();
    analytics.tracker.track("page_view", { page_location: window.location.href, page_title: document.title });
  }, [analytics, pathname]);

  return analytics && hp.capabilities.has("consent") ? <ConsentBanner consent={analytics.consent} /> : null;
}
