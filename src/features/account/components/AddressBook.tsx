"use client";

import type { SavedAddress, SavedAddressInput } from "@meumouse.com/headpress";
import { useAddressForm, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/layout";
import { AddressFields } from "@/features/checkout/components/AddressFields";
import { t } from "@/i18n";
import { onlyDigits } from "@/lib/utils";

const QUERY_KEY = ["addresses"];

function AddressForm({ address, onDone }: { address: SavedAddress | null; onDone: () => void }) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const queryClient = useQueryClient();
  const [form, actions] = useAddressForm(address ?? undefined);
  const [label, setLabel] = useState(address?.label ?? "");

  const save = useMutation({
    mutationFn: (input: SavedAddressInput) =>
      address ? hp.customer.addresses.update(address.id, input) : hp.customer.addresses.create(input),
    onSuccess: ({ addresses }) => {
      queryClient.setQueryData(QUERY_KEY, addresses);
      onDone();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!actions.validate({ requireNeighborhood: true })) return;
    const { values } = form;
    save.mutate({
      label,
      first_name: values.first_name,
      last_name: values.last_name,
      address_1: values.address_1,
      address_2: values.address_2,
      number: values.number,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state,
      postcode: onlyDigits(values.postcode ?? ""),
      country: "BR",
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t.account.addressLabel}>
        <Input value={label} onChange={(event) => setLabel(event.target.value)} />
      </Field>
      <AddressFields state={form} actions={actions} showDocument={false} />
      {save.error ? <Alert tone="danger">{formatError(save.error)}</Alert> : null}
      <Button type="submit" loading={save.isPending}>
        {t.common.save}
      </Button>
    </form>
  );
}

export function AddressBook() {
  const hp = useHeadpress();
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: QUERY_KEY, queryFn: () => hp.customer.addresses.list() });
  // `null` adds a new address; undefined keeps the dialog closed.
  const [editing, setEditing] = useState<SavedAddress | null | undefined>(undefined);

  const remove = useMutation({
    mutationFn: (id: string) => hp.customer.addresses.remove(id),
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t.account.addressesTitle}</h1>
        <Button variant="secondary" onClick={() => setEditing(null)}>
          {t.account.addressAdd}
        </Button>
      </div>

      {addresses.isPending ? <Skeleton className="h-40" /> : null}
      {addresses.isError ? <Alert tone="danger">{hp.formatError(addresses.error)}</Alert> : null}
      {addresses.data?.length === 0 ? (
        <EmptyState icon={<MapPin />} title={t.account.addressesEmpty} className="py-10" />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.data?.map((address) => (
          <Card key={address.id} className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{address.label || t.account.addressesTitle}</span>
              {address.is_default_shipping ? <Badge tone="brand">{t.account.addressDefaultShipping}</Badge> : null}
            </div>
            <p className="text-ink-muted">
              {address.address_1}, {address.number}
              <br />
              {address.neighborhood} · {address.city} {address.state}
              <br />
              {address.postcode}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(address)}>
                {t.common.edit}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(address.id)}>
                {t.common.remove}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
        title={editing ? t.account.addressEdit : t.account.addressAdd}
        closeLabel={t.common.close}
        className="max-w-2xl"
      >
        {editing !== undefined ? (
          <AddressForm key={editing?.id ?? "new"} address={editing} onDone={() => setEditing(undefined)} />
        ) : null}
      </Dialog>
    </div>
  );
}
