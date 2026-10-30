"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface CartDrawerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue>({ open: false, setOpen: () => undefined });

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

/** The cart drawer's state. A no-op outside the provider, so shared components work anywhere. */
export function useCartDrawer() {
  return useContext(CartDrawerContext);
}
