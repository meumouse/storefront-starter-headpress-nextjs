import { money, type PaymentMethod } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import {
  defaultLegs,
  parseAmountInput,
  splitLegMethods,
  splitOption,
  splitPaymentStatus,
  splitPendingPayment,
  withRemainder,
  type ProviderLookup,
} from "./split";
import type { PaymentProvider } from "./types";

function method(id: string, kind: string, config: Record<string, unknown> = {}): PaymentMethod {
  return { id, kind, title: id, config: { kind, ...config } } as unknown as PaymentMethod;
}

const provider = (submitsItself = false) => ({ id: "x", supports: () => true, Form: () => null, submitsItself }) as PaymentProvider;
const lookup: ProviderLookup = (entry) => (entry.id === "paypal" ? provider(true) : entry.id === "nope" ? null : provider());

const methods = [
  method("cielo_pix", "pix"),
  method("cielo_credit", "card"),
  method("paypal", "wallet"),
  method("nope", "card"),
  method("headpress_split", "other", { extension_key: "split_payments" }),
];
const config = {
  checkout_enabled: true,
  gateway_id: "headpress_split",
  methods: [{ id: "cielo_pix" }, { id: "cielo_credit" }, { id: "paypal" }, { id: "nope" }],
} as never;

const brl = (amount: number) => money(amount, "BRL", 2);

describe("split payments", () => {
  it("lets only methods with a form the checkout drives pay a part", () => {
    expect(splitLegMethods(methods, { paymentMethods: [] }, config, lookup).map((entry) => entry.id)).toEqual([
      "cielo_pix",
      "cielo_credit",
    ]);
  });

  it("offers the split only with two methods to combine", () => {
    expect(splitOption(methods, { paymentMethods: [] }, config, lookup)?.id).toBe("headpress_split");
    expect(splitOption(methods, { paymentMethods: ["cielo_pix", "headpress_split"] }, config, lookup)).toBeNull();
    expect(splitOption(methods, { paymentMethods: [] }, { ...(config as object), checkout_enabled: false } as never, lookup)).toBeNull();
  });

  it("starts with Pix and a card, the last part taking the rest", () => {
    const legs = defaultLegs(brl(10001), splitLegMethods(methods, { paymentMethods: [] }, config, lookup));
    expect(legs.map((leg) => [leg.gatewayId, leg.amount.amount])).toEqual([
      ["cielo_pix", 5000],
      ["cielo_credit", 5001],
    ]);
    expect(withRemainder(brl(10001), [legs[0]!, legs[1]!]).at(-1)?.amount.amount).toBe(5001);
  });

  it("reads amounts typed in either convention", () => {
    expect(parseAmountInput("120,50", 2)).toBe(12050);
    expect(parseAmountInput("1.234,5", 2)).toBe(123450);
    expect(parseAmountInput("1,234.56", 2)).toBe(123456);
    expect(parseAmountInput("R$ 80", 2)).toBe(8000);
    expect(parseAmountInput("1.000", 2)).toBe(100000);
    expect(parseAmountInput("abc", 2)).toBeNull();
  });

  it("reads the order's payment state and the first code to pay", () => {
    expect(splitPaymentStatus("paid")).toBe("paid");
    expect(splitPaymentStatus("partial")).toBe("pending");
    expect(
      splitPendingPayment({
        splitLegs: [
          { gatewayId: "cielo_credit", amount: brl(100), status: "success", message: "", instructions: null, redirectUrl: null },
          {
            gatewayId: "cielo_pix",
            amount: brl(100),
            status: "pending",
            message: "",
            instructions: { type: "pix", code: "000201", imageBase64: "", expiresAt: null },
            redirectUrl: null,
          },
        ],
      }),
    ).toEqual({ type: "pix", code: "000201", imageUrl: null, expiresAt: null });
  });
});
