#!/usr/bin/env node
/**
 * Compare the route map Headpress publishes with the routes this storefront serves.
 *
 * Headpress builds every link WordPress hands out from `routes` in the store config, so a difference
 * means some of those links answer 404 here. Run it before a deploy and after changing the map in
 * Headpress → Storefront.
 *
 *   npm run check:routes                         # WordPress of NEXT_PUBLIC_WP_URL
 *   npm run check:routes -- https://wp.example.com
 *
 * Exits 1 when a route differs or is missing. Needs Node's TypeScript support (22.18 or newer).
 */
import { existsSync, readFileSync } from "node:fs";

const { STOREFRONT_ROUTES, UNROUTED_KEYS } = await import("../src/config/routes.ts");

function envFile(name) {
  if (!existsSync(name)) return {};
  const lines = readFileSync(name, "utf8").split(/\r?\n/);
  return Object.fromEntries(
    lines
      .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
  );
}

const env = { ...envFile(".env"), ...envFile(".env.local"), ...process.env };
const baseUrl = (process.argv[2] ?? env.NEXT_PUBLIC_WP_URL ?? "").replace(/\/+$/, "");

if (!baseUrl) {
  console.error("Set NEXT_PUBLIC_WP_URL or pass the WordPress URL as an argument.");
  process.exit(1);
}

const headers = env.NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY
  ? { "X-Headpress-Key": env.NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY }
  : {};
const response = await fetch(`${baseUrl}/wp-json/headpress/v1/store/config`, { headers });

if (!response.ok) {
  console.error(`Could not read the store config: HTTP ${response.status}.`);
  process.exit(1);
}

const { routes } = await response.json();
let failed = false;

for (const [key, pattern] of Object.entries(STOREFRONT_ROUTES)) {
  if (routes[key] === pattern) continue;
  failed = true;
  console.error(`✗ ${key}: storefront serves ${pattern}, Headpress publishes ${routes[key] ?? "nothing"}.`);
}

for (const key of UNROUTED_KEYS) {
  if (routes[key]) console.warn(`! ${key}: published as ${routes[key]}, but this storefront has no page for it.`);
}

if (failed) process.exit(1);
console.log("✓ The route maps agree.");
