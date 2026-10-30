import type { Menu } from "@meumouse.com/headpress";
import Link from "next/link";

import { Container, Separator } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { t } from "@/i18n";
import { readOr } from "@/lib/headpress/safe-read";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer({ storeName }: { storeName: string }) {
  const menu = await readOr<Menu | null>(null, (hp) => hp.content.menu(siteConfig.footerMenu));
  const helpLinks = (menu?.items ?? []).map((item) => ({ label: item.title, href: item.path ?? item.url }));
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <Container className="flex flex-col gap-8 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <FooterColumn
            title={t.common.footerShop}
            links={[
              { label: t.common.shopAll, href: paths.shop },
              { label: t.common.blog, href: paths.blog },
            ]}
          />
          {helpLinks.length > 0 ? <FooterColumn title={t.common.footerHelp} links={helpLinks} /> : null}
          <FooterColumn title={t.common.footerAccount} links={[{ label: t.common.footerAccount, href: paths.account }]} />
        </div>
        <Separator />
        <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-subtle">
          <span>{t.common.footerRights(year, storeName)}</span>
          <span>{t.common.poweredBy}</span>
        </div>
      </Container>
    </footer>
  );
}
