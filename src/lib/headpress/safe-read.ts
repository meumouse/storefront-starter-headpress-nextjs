import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getServerClient, type ServerClient } from "./server";

export type ReadResult<T> = { ok: true; data: T } | { ok: false; error: unknown };

/**
 * A public read that survives WordPress being down. The caller tells "does not exist" (the SDK
 * answers null, so `notFound()`) from "did not answer" (`ok: false`, the unavailable state).
 * Answering 404 for an outage would drop indexed pages from search engines.
 */
export async function safeRead<T>(read: (hp: ServerClient) => Promise<T>): Promise<ReadResult<T>> {
  try {
    return { ok: true, data: await read(getServerClient()) };
  } catch (error) {
    unstable_rethrow(error);
    console.warn("[headpress] read failed:", error instanceof Error ? error.message : error);
    return { ok: false, error };
  }
}

/** A read of something optional (a menu, reviews): a failure just means the fallback. */
export async function readOr<T>(fallback: T, read: (hp: ServerClient) => Promise<T>): Promise<T> {
  const result = await safeRead(read);
  return result.ok ? result.data : fallback;
}
