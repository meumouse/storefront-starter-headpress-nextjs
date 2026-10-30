export const LOCALES = ["en", "pt-BR", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * One domain's texts in every language, side by side. English sets the shape; the types make the
 * other languages complete, so a missing translation fails the build.
 */
export function defineMessages<T>(en: T, others: Record<Exclude<Locale, "en">, NoInfer<T>>): Record<Locale, T> {
  return { en, ...others };
}
