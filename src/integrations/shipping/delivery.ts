import type { Cart, ShippingRate } from "@meumouse.com/headpress";

interface DeliveryEstimate {
  headline?: string;
  label?: string;
}

interface ShippingExtension {
  packages?: {
    package_id: number | string;
    rates?: { rate_id: string; delivery?: DeliveryEstimate | null }[];
  }[];
}

/**
 * The delivery estimate of a cart rate. Headpress adds it from HubGo / Envora under
 * `extensions.headpress.shipping`; carriers that send it through WooCommerce fill `deliveryTime`.
 */
export function rateDelivery(cart: Pick<Cart, "extensions">, rate: ShippingRate): string | null {
  const headpress = cart.extensions.headpress as { shipping?: ShippingExtension } | undefined;
  const entry = headpress?.shipping?.packages
    ?.find((shippingPackage) => shippingPackage.package_id === rate.packageId)
    ?.rates?.find((candidate) => candidate.rate_id === rate.id);

  return entry?.delivery?.headline || entry?.delivery?.label || rate.deliveryTime || null;
}
