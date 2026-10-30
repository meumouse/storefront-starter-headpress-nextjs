import "server-only";

import { createHeadpress } from "@meumouse.com/headpress";

import { clientOptions } from "./options";

function createServerClient() {
  // No session and no Cart-Token: this client only makes public reads, shared across requests.
  return createHeadpress(clientOptions());
}

export type ServerClient = ReturnType<typeof createServerClient>;

let shared: ServerClient | null = null;

/** The client for public server reads, created on first use (an empty URL throws). */
export function getServerClient(): ServerClient {
  shared ??= createServerClient();
  return shared;
}
