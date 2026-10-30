"use client";

import { captureAbandonedCart } from "@meumouse.com/headpress/analytics";
import { useHeadpress } from "@meumouse.com/headpress/react";
import { useEffect } from "react";

const DEBOUNCE_MS = 800;

/**
 * Tell Sellback who owns the cart, so it can send a reminder. Only after the shopper opts in.
 * `captureAbandonedCart` is quiet: it skips when the feature is off and never throws.
 */
export function useContactCapture({
  email,
  phone,
  firstName,
  optedIn,
}: {
  email: string;
  phone: string;
  firstName: string;
  optedIn: boolean;
}): void {
  const hp = useHeadpress();

  useEffect(() => {
    if (!optedIn || (!email && !phone)) return;
    const timer = setTimeout(() => {
      void captureAbandonedCart(hp, { email, phone, first_name: firstName, consent: { marketing: true } });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hp, email, phone, firstName, optedIn]);
}
