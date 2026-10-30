import { createHeadpress, createRedirectResolver } from "@meumouse.com/headpress";
import { redirectResponse } from "@meumouse.com/headpress/next";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Applies the redirects of the WordPress SEO plugin (Rank Math, Yoast) that Headpress publishes.
 * The resolver keeps the last set when WordPress fails, so an outage adds no latency to page views.
 */
const redirects = createRedirectResolver(
  createHeadpress({ baseUrl: publicEnv.wpUrl, publishableKey: publicEnv.publishableKey }).seo,
  { sameHosts: [publicEnv.wpUrl, publicEnv.siteUrl] },
);

export async function proxy(request: NextRequest) {
  const match = await redirects.resolve(request.nextUrl).catch(() => null);
  return match ? redirectResponse(match, request.url) : NextResponse.next();
}

export const config = {
  // Pages only: never API routes, Next.js assets or files with an extension.
  matcher: ["/((?!api|_next|.*\\.[\\w]+$).*)"],
};
