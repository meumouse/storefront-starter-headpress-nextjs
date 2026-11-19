import type { ReactElement } from "react";
import type { z } from "zod";

import type { EmailBrand } from "./brand";

/**
 * One email the storefront renders. `id` is the key of the Headpress email catalog
 * (`^[a-z0-9][a-z0-9-]{0,63}$`); `schema` checks the `data` Headpress sends; `example` is what the
 * panel's test send (`"example": true`) and `/api/emails/preview` render.
 */
export interface EmailTemplate<S extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  schema: S;
  subject(data: z.infer<S>, brand: EmailBrand): string;
  render(data: z.infer<S>, brand: EmailBrand): ReactElement;
  example: z.input<S>;
}

export function defineTemplate<S extends z.ZodTypeAny>(template: EmailTemplate<S>): EmailTemplate<S> {
  return template;
}
