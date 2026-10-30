import { Container, PageHeading } from "@/components/ui/layout";
import { siteConfig } from "@/config/site";
import { safeRead } from "@/lib/headpress/safe-read";

export default async function HomePage() {
  const config = await safeRead((hp) => hp.config.get());

  return (
    <Container className="py-16">
      <PageHeading title={config.ok ? config.data.store.name : siteConfig.name} />
    </Container>
  );
}
