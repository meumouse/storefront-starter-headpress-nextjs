import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Teaches tailwind-merge the design system's custom scales, so overrides replace them. */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "canvas",
        "surface",
        "sunken",
        "overlay",
        "ink",
        "ink-muted",
        "ink-subtle",
        "ink-inverse",
        "line",
        "line-strong",
        "brand",
        "brand-hover",
        "brand-soft",
        "on-brand",
        "success",
        "success-soft",
        "warning",
        "warning-soft",
        "danger",
        "danger-soft",
        "sale",
      ],
      radius: ["control", "card", "sheet"],
      shadow: ["card", "float"],
    },
  },
});

/** Join class names; later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}

/** Digits of a value, for postcodes, documents and phones. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
