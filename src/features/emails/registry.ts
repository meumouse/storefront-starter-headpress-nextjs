/**
 * Every email the storefront renders, by Headpress template id. A template Headpress asks for that
 * is not here is answered 404, a permanent failure: register it here before turning it on in
 * Headpress.
 */
import type { EmailTemplate } from "./define";
import { orderReceived, orderShipped, paymentConfirmed } from "./templates/orders";
import { wpMail } from "./templates/wp-mail";

const templates: EmailTemplate[] = [wpMail, orderReceived, paymentConfirmed, orderShipped];

export const emailTemplates: ReadonlyMap<string, EmailTemplate> = new Map(
  templates.map((template) => [template.id, template]),
);
