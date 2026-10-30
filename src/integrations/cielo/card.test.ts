import { describe, expect, it } from "vitest";

import {
  cieloCardPaymentData,
  cieloThreeDsOutcome,
  detectCieloBrand,
  maskCardNumber,
  normalizeCieloBrand,
  normalizeHolder,
  toCieloCardConfig,
  validateCieloCard,
  type CieloCardConfig,
} from "./card";

const RAW_CONFIG = {
  method: "credit",
  environment: "sandbox",
  brands: ["Visa", "Master"],
  sop: { script_url: "https://cielo.test/sop.js" },
  three_ds: "optional",
  payment_data: { payment_token: "custom_token" },
};

const VALID_CARD = { number: "4111 1111 1111 1111", holder: "Ana Silva", expiry: "12/30", cvv: "123", installments: 1 };
const TODAY = new Date("2026-10-30");

describe("toCieloCardConfig", () => {
  it("reads the gateway config, with default keys for what it leaves out", () => {
    const config = toCieloCardConfig(RAW_CONFIG);

    expect(config).toMatchObject({ kind: "credit", threeDs: "optional", sopScriptUrl: "https://cielo.test/sop.js" });
    expect(config?.keys.paymentToken).toBe("custom_token");
    expect(config?.keys.brand).toBe("wc_cielo_brand");
    expect(config?.keys.threeDs.eci).toBe("wc_cielo_3ds_eci");
  });

  it("always requires 3DS on debit", () => {
    expect(toCieloCardConfig({ ...RAW_CONFIG, method: "debit", three_ds: "off" })?.threeDs).toBe("required");
  });

  it("ignores other gateways", () => {
    expect(toCieloCardConfig({ method: "pix" })).toBeNull();
    expect(toCieloCardConfig({ method: "credit" })).toBeNull();
  });
});

describe("brands and masks", () => {
  it("detects Elo before Visa, whose ranges overlap", () => {
    expect(detectCieloBrand("4011 7800 0000 0000")).toBe("Elo");
    expect(detectCieloBrand("4111 1111 1111 1111")).toBe("Visa");
    expect(detectCieloBrand("5500 0000 0000 0004")).toBe("Master");
  });

  it("normalizes what the SOP returns", () => {
    expect(normalizeCieloBrand("VISA")).toBe("Visa");
    expect(normalizeCieloBrand("Mastercard")).toBe("Master");
    expect(normalizeCieloBrand("unknown")).toBeNull();
  });

  it("groups Amex differently", () => {
    expect(maskCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(maskCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
  });

  it("strips what the SOP refuses in the holder name", () => {
    expect(normalizeHolder("  José  da Silva 2 ")).toBe("JOSE DA SILVA");
  });
});

describe("validateCieloCard", () => {
  it("accepts a good card", () => {
    expect(validateCieloCard(VALID_CARD, ["Visa"], TODAY)).toEqual({});
  });

  it("refuses a bad check digit, a refused brand and an expired card", () => {
    expect(validateCieloCard({ ...VALID_CARD, number: "4111 1111 1111 1112" }, [], TODAY).number).toBeDefined();
    expect(validateCieloCard(VALID_CARD, ["Master"], TODAY).number).toBeDefined();
    expect(validateCieloCard({ ...VALID_CARD, expiry: "01/20" }, [], TODAY).expiry).toBeDefined();
  });

  it("asks four CVV digits on Amex", () => {
    const amex = { ...VALID_CARD, number: "3782 822463 10005", cvv: "123" };
    expect(validateCieloCard(amex, [], TODAY).cvv).toBeDefined();
    expect(validateCieloCard({ ...amex, cvv: "1234" }, [], TODAY).cvv).toBeUndefined();
  });
});

describe("cieloThreeDsOutcome", () => {
  const result = { Eci: "05" };

  it("goes on only after success when 3DS is required", () => {
    expect(cieloThreeDsOutcome("onSuccess", result, "required").ok).toBe(true);
    expect(cieloThreeDsOutcome("onUnenrolled", result, "required").ok).toBe(false);
  });

  it("goes on unauthenticated when optional, unless the bank refused", () => {
    expect(cieloThreeDsOutcome("onDisabled", null, "optional")).toEqual({ ok: true, result: null });
    expect(cieloThreeDsOutcome("onFailure", null, "optional").ok).toBe(false);
  });
});

describe("cieloCardPaymentData", () => {
  const config = toCieloCardConfig(RAW_CONFIG) as CieloCardConfig;

  it("sends the token, never the card", () => {
    const data = cieloCardPaymentData({
      config,
      sop: { PaymentToken: "token-1", Brand: "Visa", CardLast4Digits: "1111" },
      holder: "Ana Silva",
      installments: 3,
      threeDs: { Cavv: "cavv", Eci: "05" },
      document: "529.982.247-25",
    });

    expect(Object.fromEntries(data.map(({ key, value }) => [key, value]))).toEqual({
      custom_token: "token-1",
      wc_cielo_brand: "Visa",
      wc_cielo_installments: "3",
      wc_cielo_holder: "ANA SILVA",
      wc_cielo_card_last4: "1111",
      wc_cielo_document: "52998224725",
      wc_cielo_3ds_cavv: "cavv",
      wc_cielo_3ds_eci: "05",
    });
  });
});
