/**
 * `GET /api/emails/preview?template=order-shipped` renders a template with its example data, in
 * development only. Add `&format=text` for the plain-text part. Without a template, lists them.
 */
import { NextResponse } from "next/server";

import { emailTemplates } from "@/features/emails/registry";
import { emailBrand, renderEmail } from "@/features/emails/render";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ code: "not_found", message: "Not found." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const template = emailTemplates.get(params.get("template") ?? "");
  if (!template) {
    const links = [...emailTemplates.keys()]
      .map((id) => `<li><a href="?template=${id}">${id}</a> · <a href="?template=${id}&format=text">text</a></li>`)
      .join("");
    return new Response(`<!doctype html><title>Email templates</title><ul>${links}</ul>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const email = await renderEmail(template, template.schema.parse(template.example), await emailBrand());
  return params.get("format") === "text"
    ? new Response(`Subject: ${email.subject}\n\n${email.text}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
