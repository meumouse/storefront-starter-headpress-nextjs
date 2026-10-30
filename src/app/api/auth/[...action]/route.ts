import { createAuthHandler } from "@meumouse.com/headpress/next/server";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Backend-for-frontend of the customer session: the refresh token stays in an httpOnly cookie here
 * and the browser only ever holds a short-lived access token.
 */
export const { POST } = createAuthHandler({
  baseUrl: publicEnv.wpUrl,
  publishableKey: publicEnv.publishableKey,
  secretKey: serverEnv.headpressSecretKey,
});
