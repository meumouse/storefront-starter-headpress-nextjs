/**
 * The storefront's look, for email clients.
 *
 * Email clients ignore CSS variables and most do not know `oklch()`, so these are the tokens of
 * `src/styles/tokens.css` resolved to hex. This file is the one place emails take colors from:
 * rebrand it together with the tokens.
 */
export const emailColors = {
  page: "#f6f5f2",
  surface: "#ffffff",
  sunken: "#efeee9",
  text: "#20242f",
  muted: "#5c6070",
  subtle: "#848796",
  line: "#e5e3dc",
  brand: "#2648b4",
  onBrand: "#fdfdfd",
  success: "#1f7a4f",
} as const;

export const emailFont =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Who the email comes from. The name is the store's, read from Headpress when the email is sent. */
export interface EmailBrand {
  name: string;
  /** The storefront's public URL. */
  url: string;
  /** An absolute URL of a PNG or JPEG logo; most clients do not show SVG. */
  logoUrl: string | null;
}
