import { describe, expect, it } from "vitest";

import { normalizeTracking, trackingProgress } from "./tracking";

describe("order tracking", () => {
  it("keeps parcels with a code and only http(s) links", () => {
    const tracking = normalizeTracking({
      order_id: 12,
      status: "processing",
      items: [
        { tracking_number: "QB123456789BR", carrier_name: "Correios", tracking_link: "https://rastreamento.example/QB1" },
        { tracking_number: "", carrier_name: "Empty" },
        { tracking_number: "X1", provider_label: "Courier", tracking_link: "javascript:alert(1)" },
      ],
      delivery_promise: { days: 5, date: "2026-11-30", date_label: "30/11/2026", carrier: "Correios", method: "PAC", overdue: false },
    });

    expect(tracking.items).toEqual([
      { trackingNumber: "QB123456789BR", carrier: "Correios", link: "https://rastreamento.example/QB1", shippedOn: null },
      { trackingNumber: "X1", carrier: "Courier", link: null, shippedOn: null },
    ]);
    expect(tracking.promise?.dateLabel).toBe("30/11/2026");
  });

  it("reads the progress from the status and the parcels", () => {
    expect(trackingProgress({ status: "pending", items: [] })).toBe("placed");
    expect(trackingProgress({ status: "processing", items: [] })).toBe("paid");
    expect(
      trackingProgress({ status: "processing", items: [{ trackingNumber: "A", carrier: "", link: null, shippedOn: null }] }),
    ).toBe("shipped");
    expect(trackingProgress({ status: "completed", items: [] })).toBe("completed");
  });
});
