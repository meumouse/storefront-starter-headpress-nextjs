"use client";

import type { PaymentMethod } from "@meumouse.com/headpress";
import { cartEventParams } from "@meumouse.com/headpress/analytics";
import { isValidCep, parseBirthDate } from "@meumouse.com/headpress/br";
import {
  useAddressForm,
  useCapability,
  useCart,
  useCustomer,
  useFormatError,
  useHeadpress,
  useStoreConfig,
} from "@meumouse.com/headpress/react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ChoiceLabel, Field, Input, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { checkoutTrackingFields, getAnalytics } from "@/features/analytics/analytics";
import { CartNotices } from "@/features/cart/components/CartNotices";
import { ShippingOptions } from "@/features/cart/components/ShippingOptions";
import { t } from "@/i18n";
import { RecoveryCouponBanner } from "@/integrations/sellback/RecoveryCouponBanner";
import { useContactCapture } from "@/integrations/sellback/useContactCapture";

import { isValidEmail, toPayer, toShippingAddress, toStoreAddress, type ContactValues } from "../lib/address";
import {
  checkoutErrorMessage,
  validatePersonal,
  type BrazilianMarketRules,
  type PersonalErrors,
  type PersonalValues,
} from "../lib/brazilian-fields";
import { rememberPlacedOrder } from "../lib/placed-order";
import { pendingPaymentOf, providerFor } from "../payments/registry";
import { PaymentError, type Payer, type PaymentData, type PaymentFormHandle } from "../payments/types";
import { AddressFields } from "./AddressFields";
import { OrderSummary } from "./OrderSummary";
import { PaymentSection } from "./PaymentSection";
import { PersonalFields } from "./PersonalFields";

const FORM_ID = "checkout-form";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

export function CheckoutForm() {
  const hp = useHeadpress();
  const router = useRouter();
  const formatError = useFormatError();
  const { customer } = useCustomer();
  const [{ cart, status }, cartActions] = useCart({ load: "always" });
  const [address, addressActions] = useAddressForm();
  const brazilianRules: BrazilianMarketRules | undefined = useCapability("checkout_fields")?.brazilian_market;
  const brazilianFields = Boolean(brazilianRules?.active);
  const config = useStoreConfig();

  const [contact, setContact] = useState<ContactValues>({ email: "", phone: "" });
  const [personal, setPersonal] = useState<PersonalValues>({ birthdate: "", gender: "" });
  const [personalErrors, setPersonalErrors] = useState<PersonalErrors>({});
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [contactErrors, setContactErrors] = useState<{ email?: string }>({});
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [placing, setPlacing] = useState(false);
  // The order exists and the cart is now empty: the empty state must not flash on the way out.
  const [leaving, setLeaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState(false);
  const paymentHandle = useRef<PaymentFormHandle | null>(null);

  useContactCapture({
    email: contact.email.trim(),
    phone: contact.phone,
    firstName: address.values.first_name ?? "",
    optedIn: marketingOptIn,
  });

  // Once per visit to the checkout, when the cart is known.
  const checkoutStarted = useRef(false);
  useEffect(() => {
    if (!cart || cart.items.length === 0 || checkoutStarted.current) return;
    checkoutStarted.current = true;
    getAnalytics()?.tracker.track("begin_checkout", cartEventParams(cart));
  }, [cart]);

  // A signed-in customer starts from their account details.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    const { billing, shipping } = customer;
    setContact({ email: customer.email, phone: String(billing.phone ?? "") });
    addressActions.set({
      first_name: customer.first_name,
      last_name: customer.last_name,
      postcode: shipping.postcode ?? billing.postcode ?? "",
      address_1: shipping.address_1 ?? billing.address_1 ?? "",
      city: shipping.city ?? billing.city ?? "",
      state: shipping.state ?? billing.state ?? "",
    });
  }, [customer, addressActions]);

  // The Store API quotes shipping from the address it holds.
  const postcode = address.values.postcode ?? "";
  const { updateCustomer } = cartActions;
  useEffect(() => {
    if (!isValidCep(postcode)) return;
    void addressActions.lookupPostcode();
    void updateCustomer({ shipping_address: { postcode, country: "BR" } });
  }, [postcode, updateCustomer, addressActions]);

  const register = useCallback((handle: PaymentFormHandle | null) => {
    paymentHandle.current = handle;
  }, []);

  /** Check everything the order needs. Highlights the problems and answers null when something is off. */
  const validate = useCallback((): Payer | null => {
    const addressValid = addressActions.validate({
      requireDocument: true,
      requireNumber: true,
      requireNeighborhood: true,
    });
    const emailValid = isValidEmail(contact.email);
    setContactErrors({ email: emailValid ? undefined : t.checkout.emailInvalid });
    const hasRate = !cart?.needsShipping || cart.totals.shipping !== null;
    setShippingError(!hasRate);
    const personalProblems = validatePersonal(personal, contact, brazilianRules);
    setPersonalErrors(personalProblems);

    if (!addressValid || !emailValid || !hasRate || Object.keys(personalProblems).length > 0) {
      setFormError(t.checkout.fixFields);
      return null;
    }
    setFormError(null);
    return toPayer(address.values, contact);
  }, [addressActions, address.values, cart, contact, personal, brazilianRules]);

  const placeOrder = useCallback(
    async (paymentData: PaymentData): Promise<boolean> => {
      // A free order has no payment method: the Store API only asks for one when `needs_payment`.
      if (!method && cart?.needsPayment) return false;
      setPlacing(true);
      setFormError(null);
      try {
        const billingAddress = toStoreAddress(address.values, contact, { brazilianFields });
        // TODO(sdk): `place()` cannot send the Store API's `expected_total`, which would refuse the
        // order if the total changed since the shopper last saw it.
        const placed = await hp.checkout.place({
          billingAddress,
          shippingAddress: toShippingAddress(billingAddress),
          paymentMethod: method?.id ?? "",
          paymentData,
          customerNote: note.trim() || undefined,
          fields: addressActions.checkoutFields({
            cellphone: contact.phone,
            birthdate: parseBirthDate(personal.birthdate) || undefined,
            gender: personal.gender || undefined,
          }),
          ...checkoutTrackingFields(config),
        });

        if (placed.paymentStatus === "failure" || placed.paymentStatus === "error") {
          setFormError(t.checkout.orderFailed);
          return false;
        }

        const provider = method ? providerFor(method) : null;
        if (provider) {
          rememberPlacedOrder({
            orderId: placed.orderId,
            orderKey: placed.orderKey,
            providerId: provider.id,
            pending: pendingPaymentOf(provider, placed),
          });
        }

        // A hosted gateway sends the shopper away; everything else ends on the storefront.
        const redirect = placed.redirectUrl ? new URL(placed.redirectUrl) : null;
        if (redirect && !redirect.pathname.startsWith(paths.checkout)) {
          window.location.assign(redirect.href);
          return true;
        }

        setLeaving(true);
        router.push(paths.orderReceived(placed.orderId, placed.orderKey));
        void cartActions.load();
        return true;
      } catch (error) {
        setFormError(checkoutErrorMessage(error, formatError, t.common.genericError));
        return false;
      } finally {
        setPlacing(false);
      }
    },
    [
      method,
      cart,
      address.values,
      contact,
      personal,
      brazilianFields,
      hp,
      note,
      addressActions,
      router,
      cartActions,
      formatError,
      config,
    ],
  );

  const provider = method ? providerFor(method) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!method && cart?.needsPayment) || placing) return;
    if (!validate()) return;

    setPlacing(true);
    try {
      const paymentData = paymentHandle.current ? await paymentHandle.current.submit() : [];
      if (paymentData) await placeOrder(paymentData);
    } catch (error) {
      setFormError(error instanceof PaymentError ? error.message : t.common.genericError);
    } finally {
      setPlacing(false);
    }
  };

  if (leaving || (status === "loading" && !cart)) return <Skeleton className="h-96" />;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title={t.checkout.emptyTitle}
        description={t.checkout.emptyDescription}
        action={
          <Button asChild>
            <Link href={paths.shop}>{t.cart.continueShopping}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Section title={t.checkout.contactTitle}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.checkout.email} error={contactErrors.email}>
              <Input
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(event) => setContact((previous) => ({ ...previous, email: event.target.value }))}
              />
            </Field>
            <Field label={t.checkout.phone} error={personalErrors.phone ? t.checkout.fieldRequired : undefined}>
              <Input
                type="tel"
                autoComplete="tel"
                value={contact.phone}
                onChange={(event) => setContact((previous) => ({ ...previous, phone: event.target.value }))}
              />
            </Field>
          </div>
          <ChoiceLabel
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          >
            {t.checkout.marketingOptIn}
          </ChoiceLabel>
        </Section>

        <Section title={t.checkout.addressTitle}>
          <AddressFields state={address} actions={addressActions} />
          <PersonalFields
            rules={brazilianRules}
            values={personal}
            errors={personalErrors}
            onChange={(changes) => setPersonal((previous) => ({ ...previous, ...changes }))}
          />
        </Section>

        {cart.needsShipping ? (
          <Section title={t.checkout.shippingTitle}>
            {cart.hasCalculatedShipping ? (
              <ShippingOptions />
            ) : (
              <p className="text-sm text-ink-muted">{t.checkout.shippingPending}</p>
            )}
            {shippingError ? <p className="text-sm text-danger">{t.checkout.selectShipping}</p> : null}
          </Section>
        ) : null}

        <Section title={cart.needsPayment ? t.checkout.paymentTitle : t.checkout.orderNote}>
          {cart.needsPayment ? (
            <PaymentSection
              cart={cart}
              guest={!customer}
              selectedId={method?.id ?? null}
              onSelect={(next) => {
                setFormError(null);
                setMethod(next);
              }}
              getPayer={validate}
              register={register}
              placeOrder={placeOrder}
              onError={setFormError}
            />
          ) : null}
          <Field label={t.checkout.orderNote} className={cart.needsPayment ? undefined : "[&_label]:sr-only"}>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </Section>
      </form>

      {/* Outside the form: the summary has the coupon form, and forms cannot nest. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <RecoveryCouponBanner cart={cart} />
        <CartNotices cart={cart} />
        <OrderSummary cart={cart} />
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        {!provider?.submitsItself ? (
          <Button type="submit" form={FORM_ID} size="lg" disabled={cart.needsPayment && !method} loading={placing}>
            {t.checkout.placeOrder}
          </Button>
        ) : null}
        <p className="text-center text-xs text-ink-subtle">{t.checkout.terms}</p>
      </div>
    </div>
  );
}
