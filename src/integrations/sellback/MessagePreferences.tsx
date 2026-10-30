"use client";

import { useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, Skeleton } from "@/components/ui/feedback";
import { ChoiceLabel } from "@/components/ui/field";
import { t } from "@/i18n";

import { fetchPreferences, savePreferences } from "./api";

/** One switch per channel of the reminders. Each change saves on its own. */
export function MessagePreferences({ token }: { token: string }) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const queryClient = useQueryClient();
  const queryKey = ["sellback-preferences", token];

  const channels = useQuery({ queryKey, queryFn: () => fetchPreferences(hp, token), retry: false });
  const save = useMutation({
    mutationFn: (changes: Record<string, boolean>) => savePreferences(hp, token, changes),
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });

  if (channels.isPending) return <Skeleton className="h-32" />;
  if (channels.isError) return <Alert tone="danger">{t.recovery.preferencesInvalid}</Alert>;

  return (
    <div className="flex flex-col gap-3">
      {channels.data.map((channel) => (
        <ChoiceLabel
          key={channel.id}
          type="checkbox"
          checked={channel.subscribed && !channel.locked}
          disabled={channel.locked || save.isPending}
          className="rounded-control border border-line p-3"
          onChange={(event) => save.mutate({ [channel.id]: event.target.checked })}
        >
          <span className="font-medium">{channel.label}</span>
          <span className="block text-xs text-ink-muted">
            {channel.locked ? t.recovery.preferencesLocked : channel.hint}
          </span>
        </ChoiceLabel>
      ))}
      {save.isError ? <Alert tone="danger">{formatError(save.error)}</Alert> : null}
      {save.isSuccess ? <Alert tone="success">{t.recovery.preferencesSaved}</Alert> : null}
    </div>
  );
}
