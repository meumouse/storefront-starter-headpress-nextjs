import { bffSession, cookieCartToken, createHeadpress } from "@meumouse.com/headpress";

import { clientOptions } from "./options";

function createBrowserClient() {
  return createHeadpress({
    ...clientOptions(),
    // The refresh token stays in an httpOnly cookie handled by `/api/auth/[...action]`.
    session: bffSession({ basePath: "/api/auth" }),
    // A first-party cookie, so server code could read the shopper's cart too.
    cartToken: cookieCartToken(),
  });
}

export type BrowserClient = ReturnType<typeof createBrowserClient>;

let shared: BrowserClient | null = null;

/** The client browser code shares, created on first use. Also runs during server rendering. */
export function getBrowserClient(): BrowserClient {
  shared ??= createBrowserClient();
  return shared;
}
