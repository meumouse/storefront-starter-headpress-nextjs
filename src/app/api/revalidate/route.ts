import { createRevalidateRoute } from "@meumouse.com/headpress/next/server";

import { serverEnv } from "@/lib/env.server";

/**
 * The Headpress webhook. Tags on reads made through the SDK expire when WordPress says so, so public
 * pages can stay cached for long. Set the URL in Headpress → Storefront → Webhooks.
 */
export const { POST } = createRevalidateRoute({ secret: serverEnv.headpressWebhookSecret });
