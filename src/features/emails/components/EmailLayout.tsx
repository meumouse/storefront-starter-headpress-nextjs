import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import { storeLocale, t } from "@/i18n";

import { emailColors, emailFont, type EmailBrand } from "../brand";

/**
 * The frame of every email: the store's name or logo, a white card with the content, and the
 * footer. Inline styles only: they are what every email client keeps.
 */
export function EmailLayout({ brand, preview, children }: { brand: EmailBrand; preview: string; children: ReactNode }) {
  return (
    <Html lang={storeLocale}>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Body style={{ margin: 0, backgroundColor: emailColors.page, fontFamily: emailFont, color: emailColors.text }}>
        <Preview>{preview}</Preview>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>
          <Section style={{ padding: "0 8px 20px" }}>
            {brand.logoUrl ? (
              <Img src={brand.logoUrl} alt={brand.name} height={32} style={{ display: "block" }} />
            ) : (
              <Text style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: emailColors.text }}>{brand.name}</Text>
            )}
          </Section>
          <Section
            style={{
              backgroundColor: emailColors.surface,
              border: `1px solid ${emailColors.line}`,
              borderRadius: "16px",
              padding: "32px 28px",
            }}
          >
            {children}
          </Section>
          <Section style={{ padding: "20px 8px 0" }}>
            <Text style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: "18px", color: emailColors.subtle }}>
              {t.emails.footer(brand.name)}
            </Text>
            <Link href={brand.url} style={{ fontSize: "12px", color: emailColors.brand }}>
              {t.emails.visitStore}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading as="h1" style={{ margin: "0 0 12px", fontSize: "24px", lineHeight: "32px", color: emailColors.text }}>
      {children}
    </Heading>
  );
}

export function EmailText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text
      style={{ margin: "0 0 16px", fontSize: "15px", lineHeight: "24px", color: muted ? emailColors.muted : emailColors.text }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: emailColors.brand,
        color: emailColors.onBrand,
        borderRadius: "10px",
        padding: "12px 22px",
        fontSize: "15px",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: emailColors.line, margin: "24px 0" }} />;
}
