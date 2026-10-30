"use client";

import type { StoreConfig } from "@meumouse.com/headpress";
import { HeadpressProvider } from "@meumouse.com/headpress/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { getBrowserClient } from "@/lib/headpress/browser";

/** Client-side context of the whole store. The config the server read saves the browser a request. */
export function StoreProviders({ config, children }: { config: StoreConfig | null; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );

  return (
    <HeadpressProvider client={getBrowserClient()} initialConfig={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </HeadpressProvider>
  );
}
