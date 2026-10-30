import type { Menu } from "@meumouse.com/headpress";
import { ShoppingBag, User } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { SearchDialog } from "@/features/search/components/SearchDialog";
import { t } from "@/i18n";
import { readOr } from "@/lib/headpress/safe-read";

import { MobileNav, type NavItem } from "./MobileNav";

/** The WordPress menu; without one, the product categories. */
async function navigationItems(): Promise<NavItem[]> {
  const menu = await readOr<Menu | null>(null, (hp) => hp.content.menu(siteConfig.headerMenu));
  if (menu?.items.length) {
    return menu.items.map((item) => ({ label: item.title, href: item.path ?? item.url }));
  }

  const categories = await readOr([], (hp) => hp.catalog.categories({ hideEmpty: true }));
  return [
    { label: t.common.shopAll, href: paths.shop },
    ...categories.map((category) => ({ label: category.name, href: paths.category(category.slug) })),
  ];
}

export async function Header({ storeName }: { storeName: string }) {
  const items = await navigationItems();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <Container className="flex h-[var(--ds-header-height)] items-center gap-4">
        <MobileNav items={items} />
        <Link href={paths.home} className="text-lg font-semibold tracking-tight">
          {storeName}
        </Link>
        <nav aria-label={t.common.primaryNavigation} className="ml-6 hidden flex-1 lg:block">
          <ul className="flex items-center gap-6">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchDialog />
          <Button asChild variant="ghost" size="icon" aria-label={t.common.footerAccount}>
            <Link href={paths.account}>
              <User />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label={t.common.footerShop}>
            <Link href={paths.cart}>
              <ShoppingBag />
            </Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
