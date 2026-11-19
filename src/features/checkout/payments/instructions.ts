import type { PaymentInstructions } from "@meumouse.com/headpress";

import type { PendingPayment } from "./types";

/** The SDK's reading of a gateway answer, as the order-received page shows it. */
export function pendingFromInstructions(instructions: PaymentInstructions): PendingPayment {
  return instructions.type === "pix"
    ? {
        type: "pix",
        code: instructions.code,
        imageUrl: instructions.imageBase64 ? `data:image/png;base64,${instructions.imageBase64}` : null,
        expiresAt: instructions.expiresAt,
      }
    : { type: "boleto", url: instructions.url, barcode: instructions.barcode };
}
