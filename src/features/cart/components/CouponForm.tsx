"use client";

import { useCart, useFormatError } from "@meumouse.com/headpress/react";
import { X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { t } from "@/i18n";

export function CouponForm() {
  const [{ cart, error }, { applyCoupon, removeCoupon, clearError }] = useCart({ load: "never" });
  const formatError = useFormatError();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    const updated = await applyCoupon(code);
    setSubmitting(false);
    if (updated) setCode("");
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          aria-label={t.cart.couponLabel}
          placeholder={t.cart.couponLabel}
          value={code}
          onChange={(event) => {
            clearError();
            setCode(event.target.value);
          }}
        />
        <Button type="submit" variant="secondary" loading={submitting}>
          {t.cart.couponApply}
        </Button>
      </form>
      {error ? <Alert tone="danger">{formatError(error, "coupon")}</Alert> : null}
      {cart?.coupons.length ? (
        <ul className="flex flex-wrap gap-2">
          {cart.coupons.map((coupon) => (
            <li key={coupon.code}>
              <Badge tone="brand" className="gap-1">
                {coupon.code}
                <button
                  type="button"
                  aria-label={t.cart.couponRemove(coupon.code)}
                  onClick={() => void removeCoupon(coupon.code)}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
