/**
 * The Cielo card (plugin `wc-cielo-store-api`, namespace `wc-cielo/v1`) without the browser: the
 * config Headpress publishes for the gateway, card brand, masks and validation, the `bpmpi_*` fields
 * of the 3DS authentication and the Store API `payment_data`.
 *
 * The card number and CVV never reach this server or WordPress: the Silent Order Post turns them
 * into a single-use `PaymentToken`, and the 3DS script talks to Cielo directly (`./browser`).
 * Contract: `docs/api/headless.md` in the plugin.
 */
import { t } from "@/i18n";
import { onlyDigits } from "@/lib/utils";

export type CieloThreeDsMode = "off" | "optional" | "required";
export type CieloThreeDsField = "cavv" | "xid" | "eci" | "version" | "reference_id";
export type CieloCardKind = "credit" | "debit";

/** `config.installments` of the credit gateway (amounts in minor units). */
export interface CieloInstallmentRules {
  modality: "ByMerchant" | "ByIssuer";
  max_installments: number;
  interest_free_installments: number;
  /** Monthly rate, in percent. */
  interest_rate: number;
  min_installment_amount: number;
  /** Brands the store cannot split itself: 1x only. */
  single_installment_brands: string[];
}

export interface CieloCardConfig {
  kind: CieloCardKind;
  environment: "sandbox" | "production";
  /** Accepted brands, with Cielo's names ("Visa", "Master", "Elo"…); empty means no check. */
  brands: string[];
  sopScriptUrl: string;
  threeDs: CieloThreeDsMode;
  installments: CieloInstallmentRules | null;
  /** Keys of the checkout's `payment_data`. */
  keys: {
    document: string;
    paymentToken: string;
    brand: string;
    holder: string;
    last4: string;
    installments: string;
    threeDs: Record<CieloThreeDsField, string>;
  };
}

/** 3DS keys when the config leaves them out (the plugin's `Payments\Three_Ds::FIELDS`). */
const THREE_DS_KEYS: Record<CieloThreeDsField, string> = {
  cavv: "wc_cielo_3ds_cavv",
  xid: "wc_cielo_3ds_xid",
  eci: "wc_cielo_3ds_eci",
  version: "wc_cielo_3ds_version",
  reference_id: "wc_cielo_3ds_reference_id",
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function count(value: unknown, fallback: number): number {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number >= 0 ? number : fallback;
}

function toInstallmentRules(raw: unknown): CieloInstallmentRules | null {
  if (!raw || typeof raw !== "object") return null;
  const rules = raw as Record<string, unknown>;
  return {
    modality: rules.modality === "ByIssuer" ? "ByIssuer" : "ByMerchant",
    max_installments: Math.max(1, Math.round(count(rules.max_installments, 1))),
    interest_free_installments: Math.round(count(rules.interest_free_installments, 0)),
    interest_rate: count(rules.interest_rate, 0),
    min_installment_amount: Math.round(count(rules.min_installment_amount, 0)),
    single_installment_brands: Array.isArray(rules.single_installment_brands)
      ? rules.single_installment_brands.filter((brand): brand is string => typeof brand === "string")
      : [],
  };
}

/** The card config of a Headpress payment method `config`, or null for anything else. */
export function toCieloCardConfig(config: Record<string, unknown>): CieloCardConfig | null {
  const kind = config.method === "credit" || config.method === "debit" ? config.method : null;
  if (!kind) return null;

  const sop = (config.sop ?? {}) as Record<string, unknown>;
  const sopScriptUrl = text(sop.script_url);
  if (!sopScriptUrl) return null;

  const keys = (config.payment_data ?? {}) as Record<string, unknown>;
  const threeDsKeys = (keys.three_ds ?? {}) as Record<string, unknown>;
  const mode = text(config.three_ds, "off");

  return {
    kind,
    environment: config.environment === "production" ? "production" : "sandbox",
    brands: Array.isArray(config.brands)
      ? config.brands.filter((brand): brand is string => typeof brand === "string")
      : [],
    sopScriptUrl,
    // Debit always needs the bank's authentication, whatever the credit setting says.
    threeDs: kind === "debit" ? "required" : mode === "required" || mode === "optional" ? mode : "off",
    installments: toInstallmentRules(config.installments),
    keys: {
      document: text(keys.document, "wc_cielo_document"),
      paymentToken: text(keys.payment_token, "wc_cielo_payment_token"),
      brand: text(keys.brand, "wc_cielo_brand"),
      holder: text(keys.holder, "wc_cielo_holder"),
      last4: text(keys.last4, "wc_cielo_card_last4"),
      installments: text(keys.installments, "wc_cielo_installments"),
      threeDs: {
        cavv: text(threeDsKeys.cavv, THREE_DS_KEYS.cavv),
        xid: text(threeDsKeys.xid, THREE_DS_KEYS.xid),
        eci: text(threeDsKeys.eci, THREE_DS_KEYS.eci),
        version: text(threeDsKeys.version, THREE_DS_KEYS.version),
        reference_id: text(threeDsKeys.reference_id, THREE_DS_KEYS.reference_id),
      },
    },
  };
}

// ----- Brand and masks -----

/** Brand by the start of the number. More specific patterns first (Elo overlaps Visa and Master). */
const BRAND_PATTERNS: [string, RegExp][] = [
  [
    "Elo",
    /^(4011(78|79)|43(1274|8935)|45(1416|7393|763[12])|50(4175|6699|67\d{2}|9\d{3})|627780|63(6297|6368)|650(0(3[1-9]|[4-9]\d)|4(0[5-9]|[1-3]\d|8[5-9]|9\d)|5([0-2]\d|3[0-8]|4[1-9]|[5-8]\d|9[0-8])|7(0\d|1[0-8]|2[0-7])|9(0[1-9]|[1-6]\d|7[0-8]))|6516(5[2-9]|[6-7]\d)|6550([0-1]\d|2[1-9]|[3-4]\d|5[0-8]))/,
  ],
  ["Hipercard", /^(606282|3841)/],
  ["Amex", /^3[47]/],
  ["Diners", /^3(0[0-5]|[68])/],
  ["JCB", /^35(2[89]|[3-8])/],
  ["Discover", /^6(011|5|4[4-9])/],
  ["Master", /^(5[1-5]|2(2(2[1-9]|[3-9])|[3-6]|7([01]|20)))/],
  ["Visa", /^4/],
];

export function detectCieloBrand(number: string): string | null {
  const digits = onlyDigits(number);
  if (!digits) return null;
  return BRAND_PATTERNS.find(([, pattern]) => pattern.test(digits))?.[0] ?? null;
}

const BRAND_NAMES = ["Visa", "Master", "Elo", "Amex", "Diners", "Discover", "JCB", "Aura", "Hipercard"];
const BRAND_ALIASES: Record<string, string> = {
  mastercard: "Master",
  americanexpress: "Amex",
  dinersclub: "Diners",
};

/** Cielo's name for the brand the SOP returns ("VISA", "Mastercard" → "Visa", "Master"). */
export function normalizeCieloBrand(value: string | null | undefined): string | null {
  const key = (value ?? "").replace(/[^A-Za-z]/g, "").toLowerCase();
  if (!key) return null;
  return BRAND_ALIASES[key] ?? BRAND_NAMES.find((name) => name.toLowerCase() === key) ?? null;
}

/** Amex has a 4-digit CVV; the others, 3. */
export function cvvLength(brand: string | null): number {
  return brand === "Amex" ? 4 : 3;
}

/** "4111 1111 1111 1111"; Amex and Diners as 4-6-5 / 4-6-4. */
export function maskCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 19);
  const brand = detectCieloBrand(digits);
  const groups = brand === "Amex" || brand === "Diners" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  return parts.join(" ");
}

/** "MM/YY". */
export function maskExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** The SOP only takes unaccented letters and spaces in the holder name (up to 64). */
export function normalizeHolder(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 64);
}

/** "MM/YY" as month and 4-digit year, or null when invalid. */
export function parseExpiry(value: string): { month: string; year: string } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month: match[1] ?? "", year: `20${match[2]}` };
}

function luhn(digits: string): boolean {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return digits.length > 0 && sum % 10 === 0;
}

// ----- Form -----

export interface CieloCardValues {
  number: string;
  holder: string;
  /** "MM/YY". */
  expiry: string;
  cvv: string;
  installments: number | null;
}

export type CieloCardErrors = Partial<Record<keyof CieloCardValues, string>>;

const BRAND_LABELS: Record<string, string> = { Master: "Mastercard", Amex: "American Express" };

export function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? brand;
}

/** Errors of the card form. `brands` are the ones the store accepts (empty means no check). */
export function validateCieloCard(
  values: CieloCardValues,
  brands: string[] = [],
  now = new Date(),
): CieloCardErrors {
  const errors: CieloCardErrors = {};
  const digits = onlyDigits(values.number);
  const brand = detectCieloBrand(digits);

  if (digits.length < 13 || digits.length > 19 || !luhn(digits)) {
    errors.number = t.checkout.cardNumberInvalid;
  } else if (brands.length > 0 && brand && !brands.includes(brand)) {
    errors.number = t.checkout.cardBrandRejected(brandLabel(brand));
  }

  if (normalizeHolder(values.holder).length < 3) errors.holder = t.checkout.cardHolderInvalid;

  const expiry = parseExpiry(values.expiry);
  if (!expiry) {
    errors.expiry = t.checkout.cardExpiryInvalid;
  } else if (new Date(Number(expiry.year), Number(expiry.month), 0, 23, 59, 59) < now) {
    errors.expiry = t.checkout.cardExpired;
  }

  if (onlyDigits(values.cvv).length !== cvvLength(brand)) {
    errors.cvv = t.checkout.cardCvvInvalid(cvvLength(brand));
  }

  if (!values.installments) errors.installments = t.checkout.cardInstallmentsRequired;

  return errors;
}

// ----- Installments -----

/** An option of `GET wc-cielo/v1/store/installments` (minor units). */
export interface CieloInstallmentOption {
  installments: number;
  installment_amount: number;
  total: number;
  interest: number;
  interest_free: boolean;
  rate: number;
}

export interface CieloInstallmentPlan {
  modality: "ByMerchant" | "ByIssuer";
  brand: string | null;
  options: CieloInstallmentOption[];
}

// ----- 3DS -----

export interface CieloThreeDsToken {
  access_token: string;
  expires_at: string | null;
  environment: "SDB" | "PRD";
  script_url: string;
  device_ip: string;
  establishment_code?: string;
}

/** The buyer, as the 3DS authentication needs them. */
export interface CieloThreeDsPayer {
  name: string;
  email: string;
  /** E.164 (+5511999999999) or national. */
  phone: string;
  /** CPF or CNPJ. */
  document: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

/** Phone digits with the country code (a national number is read as Brazilian). */
function phoneWithCountry(phone: string): string {
  const digits = onlyDigits(phone);
  return phone.trim().startsWith("+") ? digits : `55${digits}`;
}

/**
 * The `bpmpi_*` fields of one authentication. Besides the required ones, CPF, complement and "guest"
 * go too: the more data, the fewer challenges the bank asks for. `totalAmount` (minor units) is what
 * will be charged, installment interest included.
 */
export function cieloThreeDsFields({
  token,
  kind,
  orderNumber,
  totalAmount,
  installments,
  card,
  payer,
  merchantUrl,
  guest,
}: {
  token: CieloThreeDsToken;
  kind: CieloCardKind;
  orderNumber: string;
  totalAmount: number;
  installments: number;
  card: Pick<CieloCardValues, "number" | "expiry">;
  payer: CieloThreeDsPayer;
  merchantUrl: string;
  guest: boolean;
}): Record<string, string> {
  const expiry = parseExpiry(card.expiry);
  const street = `${payer.street.trim()}, ${payer.number.trim()}`.slice(0, 60);
  const street2 = [payer.complement?.trim(), payer.neighborhood.trim()].filter(Boolean).join(" - ").slice(0, 60);
  const fields: Record<string, string> = {
    bpmpi_auth: "true",
    bpmpi_accesstoken: token.access_token,
    bpmpi_ordernumber: orderNumber.slice(0, 50),
    bpmpi_currency: "BRL",
    bpmpi_totalamount: String(Math.round(totalAmount)),
    bpmpi_installments: String(installments),
    bpmpi_paymentmethod: kind === "debit" ? "Debit" : "Credit",
    bpmpi_cardnumber: onlyDigits(card.number),
    bpmpi_cardexpirationmonth: expiry?.month ?? "",
    bpmpi_cardexpirationyear: expiry?.year ?? "",
    bpmpi_order_productcode: "PHY",
    bpmpi_merchant_url: merchantUrl.slice(0, 100),
    bpmpi_device_channel: "Browser",
    bpmpi_billto_customerid: onlyDigits(payer.document),
    bpmpi_billto_contactname: payer.name.trim().slice(0, 120),
    bpmpi_billto_email: payer.email.trim().slice(0, 255),
    bpmpi_billto_phonenumber: phoneWithCountry(payer.phone).slice(0, 15),
    bpmpi_billto_street1: street,
    bpmpi_billto_city: payer.city.trim().slice(0, 50),
    bpmpi_billto_state: payer.state,
    bpmpi_billto_zipcode: onlyDigits(payer.zip).slice(0, 8),
    bpmpi_billto_country: "BR",
    bpmpi_useraccount_guest: guest ? "true" : "false",
  };

  if (street2) fields.bpmpi_billto_street2 = street2;
  if (token.device_ip) fields.bpmpi_device_ipaddress = token.device_ip;
  if (token.establishment_code) fields.bpmpi_brand_establishment_code = token.establishment_code;

  return fields;
}

/** The final event of the 3DS script, and what it hands over. */
export type CieloThreeDsEvent =
  | "onSuccess"
  | "onFailure"
  | "onUnenrolled"
  | "onDisabled"
  | "onError"
  | "onUnsupportedBrand";

export interface CieloThreeDsResult {
  Cavv?: string | null;
  Xid?: string | null;
  Eci?: string | number | null;
  Version?: string | null;
  ReferenceId?: string | null;
  ReturnCode?: string | null;
  ReturnMessage?: string | null;
}

export type CieloThreeDsOutcome =
  | { ok: true; result: CieloThreeDsResult | null }
  | { ok: false; message: string };

/**
 * What to do with the 3DS answer. With 3DS required only `onSuccess` goes on (the server still
 * checks the brand's ECI); when optional, the others go on unauthenticated, except the bank refusing
 * it (`onFailure`), which never does.
 */
export function cieloThreeDsOutcome(
  event: CieloThreeDsEvent,
  result: CieloThreeDsResult | null,
  mode: CieloThreeDsMode,
): CieloThreeDsOutcome {
  if (event === "onSuccess") return { ok: true, result };
  if (event === "onFailure") return { ok: false, message: t.checkout.cieloBankRefused };
  if (mode === "optional") return { ok: true, result: event === "onUnenrolled" ? result : null };
  if (event === "onUnenrolled") return { ok: false, message: t.checkout.cieloNotEnrolled };
  if (event === "onUnsupportedBrand") return { ok: false, message: t.checkout.cieloBrandUnsupported };
  return { ok: false, message: t.checkout.cieloAuthFailed };
}

// ----- Checkout -----

/** What the SOP hands back (`enableBinQuery` adds brand and last digits). */
export interface CieloSopResult {
  PaymentToken: string;
  Brand?: string | null;
  CardLast4Digits?: string | null;
}

/** The checkout's `payment_data`: SOP token, brand, installments and the 3DS result. */
export function cieloCardPaymentData({
  config,
  sop,
  holder,
  installments,
  threeDs,
  document,
}: {
  config: CieloCardConfig;
  sop: CieloSopResult;
  holder: string;
  installments: number;
  threeDs: CieloThreeDsResult | null;
  /** CPF or CNPJ of the payer, when the checkout has it. */
  document?: string;
}): { key: string; value: string }[] {
  const data = [
    { key: config.keys.paymentToken, value: sop.PaymentToken },
    { key: config.keys.brand, value: sop.Brand ?? "" },
    { key: config.keys.installments, value: String(installments) },
    { key: config.keys.holder, value: normalizeHolder(holder) },
    { key: config.keys.last4, value: sop.CardLast4Digits ?? "" },
    { key: config.keys.document, value: onlyDigits(document ?? "") },
  ];

  if (threeDs && threeDs.Eci !== null && threeDs.Eci !== undefined && String(threeDs.Eci) !== "") {
    const values: Record<CieloThreeDsField, unknown> = {
      cavv: threeDs.Cavv,
      xid: threeDs.Xid,
      eci: threeDs.Eci,
      version: threeDs.Version,
      reference_id: threeDs.ReferenceId,
    };
    for (const [field, value] of Object.entries(values) as [CieloThreeDsField, unknown][]) {
      if (value !== null && value !== undefined && String(value) !== "") {
        data.push({ key: config.keys.threeDs[field], value: String(value) });
      }
    }
  }

  return data.filter((entry) => entry.value !== "");
}
