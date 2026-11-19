/**
 * `wp-mail`: every other `wp_mail()` of the site (WordPress notices, one-time codes, WooCommerce
 * emails without a template of their own), handed over by Headpress's `route_wp_mail`. The message
 * keeps its subject and text and gains the store's frame.
 */
import { Link, Section } from "@react-email/components";
import type { ReactNode } from "react";
import { z } from "zod";

import { emailColors } from "../brand";
import { EmailLayout, EmailText } from "../components/EmailLayout";
import { defineTemplate } from "../define";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

/** Plain text with clickable links. WordPress wraps some links in `<…>`. */
function linkify(line: string): ReactNode[] {
  return line.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <Link key={index} href={part} style={{ color: emailColors.brand, wordBreak: "break-all" }}>
        {part}
      </Link>
    ) : (
      part.replace(/[<>]/g, "")
    ),
  );
}

/**
 * The part of an HTML message that belongs inside the frame: the `<body>` without scripts and
 * stylesheets. The HTML comes from WordPress itself (the request is signed), so this trims rather
 * than sanitizes.
 */
export function bodyHtml(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(html|head|body|meta|title|link)[^>]*>/gi, "");
}

export function previewOf(data: { body: string; html: boolean }): string {
  const text = data.html ? data.body.replace(/<[^>]+>/g, " ") : data.body;
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export const wpMail = defineTemplate({
  id: "wp-mail",
  schema: z.object({
    subject: z.string().trim().min(1).max(300),
    body: z.string().max(500_000),
    html: z.boolean().default(false),
  }),
  subject: ({ subject }) => subject,
  render: (data, brand) => (
    <EmailLayout brand={brand} preview={previewOf(data)}>
      {data.html ? (
        <Section>
          <div
            style={{ fontSize: "15px", lineHeight: "24px", color: emailColors.text }}
            dangerouslySetInnerHTML={{ __html: bodyHtml(data.body) }}
          />
        </Section>
      ) : (
        data.body
          .replace(/\r\n/g, "\n")
          .trim()
          .split(/\n{2,}/)
          .map((paragraph, index) => (
            <EmailText key={index}>
              {paragraph.split("\n").map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {linkify(line)}
                </span>
              ))}
            </EmailText>
          ))
      )}
    </EmailLayout>
  ),
  example: {
    subject: "Your sign-in code",
    body: "Hello,\n\nYour sign-in code is 482913. It expires in 5 minutes.\n\nIf you did not ask for it, ignore this email.\n\nhttp://localhost:3000/account/login",
    html: false,
  },
});
