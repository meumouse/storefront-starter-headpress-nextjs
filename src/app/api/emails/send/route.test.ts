import { signWebhook } from "@meumouse.com/headpress/webhooks";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The store name comes from Headpress; the test runs without it.
vi.mock("@/lib/headpress/safe-read", () => ({ readOr: async (fallback: unknown) => fallback }));

const SECRET = "test-secret";
let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
  vi.stubEnv("HEADPRESS_WEBHOOK_SECRET", SECRET);
  ({ POST } = await import("./route"));
});

async function delivery(body: unknown, secret = SECRET) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  return new Request("http://localhost/api/emails/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Headpress-Timestamp": String(timestamp),
      "X-Headpress-Signature": await signWebhook(secret, timestamp, raw),
    },
    body: raw,
  });
}

describe("POST /api/emails/send", () => {
  it("renders and accepts a signed email", async () => {
    const response = await POST(
      await delivery({ template: "wp-mail", to: ["ana@example.com"], data: { subject: "Hello", body: "Hi https://example.com" } }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "logged", id: "" });
  });

  it("renders a template's example for the panel's test send", async () => {
    const response = await POST(await delivery({ template: "order-shipped", to: ["ana@example.com"], example: true }));
    expect(response.status).toBe(200);
  });

  it("refuses a wrong signature", async () => {
    const response = await POST(await delivery({ template: "wp-mail", to: ["ana@example.com"] }, "other-secret"));
    expect(response.status).toBe(401);
  });

  it("answers permanent failures for an unknown template and bad data", async () => {
    expect((await POST(await delivery({ template: "nope", to: ["ana@example.com"] }))).status).toBe(404);
    expect((await POST(await delivery({ template: "order-received", to: ["ana@example.com"], data: {} }))).status).toBe(422);
  });
});
