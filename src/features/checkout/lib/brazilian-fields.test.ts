import { HeadpressError } from "@meumouse.com/headpress";
import { describe, expect, it } from "vitest";

import { checkoutErrorMessage, validatePersonal } from "./brazilian-fields";

const CONTACT = { email: "ana@example.com", phone: "" };
const EMPTY = { birthdate: "", gender: "" };

describe("validatePersonal", () => {
  it("asks only for what the store requires", () => {
    expect(validatePersonal(EMPTY, CONTACT, { active: true })).toEqual({});
    expect(validatePersonal(EMPTY, CONTACT, undefined)).toEqual({});
  });

  it("requires a real birth date when the store asks for one", () => {
    const rules = { birthdate: true };

    expect(validatePersonal(EMPTY, CONTACT, rules).birthdate).toBe(true);
    expect(validatePersonal({ ...EMPTY, birthdate: "31/02/1990" }, CONTACT, rules).birthdate).toBe(true);
    expect(validatePersonal({ ...EMPTY, birthdate: "15/03/1990" }, CONTACT, rules)).toEqual({});
  });

  it("requires a phone only when the store says so", () => {
    expect(validatePersonal(EMPTY, CONTACT, { cell_phone: "optional" })).toEqual({});
    expect(validatePersonal(EMPTY, CONTACT, { cell_phone: "required" }).phone).toBe(true);
  });
});

describe("checkoutErrorMessage", () => {
  const format = () => "Check your checkout details.";

  it("prefers the field the server named", () => {
    const error = new HeadpressError("headpress_checkout_field_invalid", "Date of birth is required.", 400, {
      status: 400,
      fields: { billing_birthdate: "Date of birth is required." },
    });

    expect(checkoutErrorMessage(error, format, "generic")).toBe("Date of birth is required.");
  });

  it("falls back to the dictionary, then to the generic text", () => {
    const error = new HeadpressError("headpress_rate_limited", "", 429, { status: 429 });

    expect(checkoutErrorMessage(error, format, "generic")).toBe("Check your checkout details.");
    expect(checkoutErrorMessage(new Error("boom"), format, "generic")).toBe("generic");
  });
});
