import { describe, expect, it } from "vitest";

import { isValidEmail, toPayer, toStoreAddress } from "./address";

const VALUES = {
  first_name: "Ana",
  last_name: "Silva",
  address_1: "Av. Paulista",
  address_2: "Apt 12",
  number: "1000",
  neighborhood: "Bela Vista",
  city: "Sao Paulo",
  state: "SP",
  postcode: "01310-100",
  document: "529.982.247-25",
};
const CONTACT = { email: " ana@example.com ", phone: "(11) 99999-8888" };

describe("toStoreAddress", () => {
  it("keeps number and neighborhood apart with the Brazilian Market fields", () => {
    const address = toStoreAddress(VALUES, CONTACT, { brazilianFields: true });

    expect(address).toMatchObject({ address_1: "Av. Paulista", address_2: "Apt 12", postcode: "01310100" });
  });

  it("folds them into the address lines without those fields, or they would be lost", () => {
    const address = toStoreAddress(VALUES, CONTACT, { brazilianFields: false });

    expect(address).toMatchObject({ address_1: "Av. Paulista, 1000", address_2: "Apt 12 - Bela Vista" });
  });

  it("cleans the contact", () => {
    expect(toStoreAddress(VALUES, CONTACT, { brazilianFields: true })).toMatchObject({
      email: "ana@example.com",
      phone: "11999998888",
    });
  });
});

describe("toPayer", () => {
  it("keeps digits only in the document and postcode", () => {
    expect(toPayer(VALUES, CONTACT)).toMatchObject({ document: "52998224725", postcode: "01310100" });
  });
});

describe("isValidEmail", () => {
  it("accepts a plausible address", () => {
    expect(isValidEmail("ana@example.com")).toBe(true);
    expect(isValidEmail("ana@example")).toBe(false);
  });
});
