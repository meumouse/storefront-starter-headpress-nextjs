import type { PlacedOrder } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { cieloDocumentKey, cieloPendingPix, cieloStatus } from "./provider";

function order(paymentDetails: Record<string, string>): PlacedOrder {
  return { paymentDetails } as unknown as PlacedOrder;
}

describe("cieloPendingPix", () => {
  it("reads the code, the image URL and the expiry", () => {
    expect(
      cieloPendingPix(
        order({
          cielo_pix_copy_paste: "000201",
          cielo_pix_qr_code_url: "https://wp.test/qr.png",
          cielo_expires_at: "2026-10-30T12:00:00Z",
        }),
      ),
    ).toEqual({
      type: "pix",
      code: "000201",
      imageUrl: "https://wp.test/qr.png",
      expiresAt: "2026-10-30T12:00:00Z",
    });
  });

  it("is null for a card order", () => {
    expect(cieloPendingPix(order({ cielo_status: "paid" }))).toBeNull();
  });
});

describe("cieloDocumentKey", () => {
  it("uses the key the gateway publishes, else the plugin's own", () => {
    expect(cieloDocumentKey({ payment_data: { document: "custom_document" } })).toBe("custom_document");
    expect(cieloDocumentKey({})).toBe("wc_cielo_document");
  });
});

describe("cieloStatus", () => {
  it("maps the plugin's statuses", () => {
    expect(cieloStatus("paid")).toBe("paid");
    expect(cieloStatus("authorized")).toBe("paid");
    expect(cieloStatus("awaiting_payment")).toBe("pending");
    expect(cieloStatus("expired")).toBe("expired");
    expect(cieloStatus("cancelled")).toBe("failed");
  });
});
