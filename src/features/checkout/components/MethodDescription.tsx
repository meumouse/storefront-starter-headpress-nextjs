import type { PaymentFormProps } from "../payments/types";

/** The gateway's own description, for methods with nothing to fill in. */
export function MethodDescription({ method }: PaymentFormProps) {
  return method.description ? <p className="text-sm text-ink-muted">{method.description}</p> : null;
}
