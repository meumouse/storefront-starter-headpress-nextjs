import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { siteConfig } from "@/config/site";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { CartDrawerProvider } from "@/features/cart/components/CartDrawerProvider";
import { safeRead } from "@/lib/headpress/safe-read";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const config = await safeRead((hp) => hp.config.get());
  const storeName = config.ok ? config.data.store.name : siteConfig.name;

  return (
    <CartDrawerProvider>
      <Header storeName={storeName} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer storeName={storeName} />
      <CartDrawer />
    </CartDrawerProvider>
  );
}
