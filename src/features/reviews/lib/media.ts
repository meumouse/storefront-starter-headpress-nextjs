import type { ReviewMedia } from "@meumouse.com/headpress";

/** The smallest size WordPress made that still fills a thumbnail, else the original. */
export function thumbnailUrl(media: Pick<ReviewMedia, "url" | "sizes">): string {
  const sizes = media.sizes ?? {};
  return sizes.thumbnail?.url || sizes.medium?.url || media.url;
}

/** The largest size short of the original, which can be several megabytes. */
export function fullUrl(media: Pick<ReviewMedia, "url" | "sizes">): string {
  const sizes = media.sizes ?? {};
  return sizes.large?.url || sizes.medium_large?.url || media.url;
}

/** A byte count as the shopper reads it in an upload limit. */
export function formatBytes(bytes: number, locale: string): string {
  const megabytes = bytes / 1024 / 1024;
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: megabytes < 10 ? 1 : 0 }).format(megabytes);
  return `${value} MB`;
}

export function formatReviewDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale, { dateStyle: "medium" });
}
