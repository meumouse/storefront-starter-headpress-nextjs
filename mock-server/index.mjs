/**
 * A fake WordPress with Headpress, WooCommerce and the supported plugins.
 *
 * It answers the same HTTP contract as a real store, from memory, so the storefront has no demo
 * branches and this code never reaches the production bundle. State is lost on restart.
 *
 *   npm run mock           # http://127.0.0.1:8787
 *   npm run demo           # this server plus `next dev`
 */
import { createServer } from "node:http";
import { Readable } from "node:stream";

import { createRoutes } from "./routes.mjs";

const port = Number(process.env.MOCK_PORT ?? 8787);
const host = process.env.MOCK_HOST ?? "127.0.0.1";
const baseUrl = `http://${host}:${port}`;

const routes = createRoutes({ baseUrl });

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Cart-Token, Nonce, If-None-Match, X-Headpress-Key, X-Headpress-Captcha, X-Headpress-Client-IP, X-Headpress-Secret",
  "Access-Control-Expose-Headers": "Cart-Token, X-WP-Total, X-WP-TotalPages, ETag, Retry-After",
  "Access-Control-Max-Age": "600",
};

function toRequest(incoming) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";
  return new Request(`${baseUrl}${incoming.url}`, {
    method: incoming.method,
    headers,
    body: hasBody ? Readable.toWeb(incoming) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

const server = createServer(async (incoming, outgoing) => {
  const origin = incoming.headers.origin ?? "*";
  const cors = { ...CORS_HEADERS, "Access-Control-Allow-Origin": origin, Vary: "Origin" };

  if (incoming.method === "OPTIONS") {
    outgoing.writeHead(204, cors).end();
    return;
  }

  try {
    const response = await routes.fetch(toRequest(incoming));
    const body = Buffer.from(await response.arrayBuffer());
    outgoing.writeHead(response.status, { ...Object.fromEntries(response.headers), ...cors }).end(body);
  } catch (error) {
    console.error(error);
    outgoing
      .writeHead(500, { "Content-Type": "application/json", ...cors })
      .end(JSON.stringify({ code: "mock_error", message: String(error), data: { status: 500 } }));
  }
});

server.listen(port, host, () => {
  console.log(`[mock] WordPress answering at ${baseUrl}/wp-json`);
});
