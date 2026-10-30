"use client";

import { useCustomer, useHeadpress } from "@meumouse.com/headpress/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const NAVIGATION = [
  { href: paths.account, label: t.account.navOverview },
  { href: paths.orders, label: t.account.navOrders },
  { href: paths.addresses, label: t.account.navAddresses },
  { href: paths.wishlist, label: t.account.navWishlist },
  { href: paths.profile, label: t.account.navProfile },
];

/** Everything behind sign-in. The server cannot tell (the session is in the browser), so this checks. */
export function AccountShell({ children }: { children: ReactNode }) {
  const hp = useHeadpress();
  const router = useRouter();
  const pathname = usePathname();
  const { customer, status } = useCustomer();

  useEffect(() => {
    if (status !== "loading" && !customer) {
      router.replace(`${paths.login}?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, customer, router, pathname]);

  if (!customer) return <Skeleton className="h-80" />;

  const signOut = async () => {
    await hp.auth.logout();
    router.push(paths.home);
    router.refresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <aside className="flex flex-col gap-4">
        <p className="font-medium">{t.account.greeting(customer.first_name || customer.display_name)}</p>
        <nav aria-label={t.account.title}>
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {NAVIGATION.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "block rounded-control px-3 py-2 text-sm transition-colors hover:bg-sunken",
                    pathname === item.href && "bg-sunken font-medium",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Button variant="ghost" size="sm" className="justify-start" onClick={signOut}>
          {t.account.signOut}
        </Button>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
