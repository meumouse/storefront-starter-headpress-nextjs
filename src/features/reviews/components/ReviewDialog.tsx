"use client";

/* Uploaded review media may live on an object storage host `next/image` is not configured for. */
/* eslint-disable @next/next/no-img-element */
import type { ReviewEligibility } from "@meumouse.com/headpress";
import type { ReviewFile } from "@meumouse.com/headpress/controllers";
import {
  useCapability,
  useFormatError,
  useHeadpress,
  useReviewForm,
  useSignedIn,
} from "@meumouse.com/headpress/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Spinner } from "@/components/ui/feedback";
import { ChoiceLabel, Field, Input, Textarea } from "@/components/ui/field";
import { paths } from "@/config/routes";
import { storeLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

import { formatBytes, thumbnailUrl } from "../lib/media";
import { StarInput } from "./StarInput";

function eligibilityMessage(eligibility: ReviewEligibility): string {
  switch (eligibility.reason) {
    case "login_required":
      return t.reviews.loginRequired;
    case "not_verified_owner":
      return t.reviews.notVerifiedOwner;
    case "already_reviewed":
      return t.reviews.alreadyReviewed;
    case "reviews_closed":
      return t.reviews.reviewsClosed;
    default:
      return t.reviews.cannotReview;
  }
}

function UploadedFile({ file, onRemove }: { file: ReviewFile; onRemove(): void }) {
  const name = file.file.name ?? "";
  const upload = file.upload;

  return (
    <li
      className={cn(
        "relative size-20 overflow-hidden rounded-control border border-line bg-sunken",
        file.status === "error" && "border-danger",
      )}
    >
      {file.status === "uploading" ? (
        <span className="flex size-full items-center justify-center text-ink-muted">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="sr-only">{t.reviews.formMediaUploading}</span>
        </span>
      ) : upload && file.kind === "video" ? (
        <video src={`${upload.url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
      ) : upload ? (
        <img src={thumbnailUrl(upload)} alt="" className="size-full object-cover" />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.reviews.formMediaRemove(name)}
        className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-surface text-ink shadow-card"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

function ReviewForm({ productId, onDone }: { productId: number; onDone(): void }) {
  const config = useCapability("reviews");
  const signedIn = useSignedIn();
  const formatError = useFormatError();
  const queryClient = useQueryClient();
  const [state, actions] = useReviewForm(productId);
  const [guest, setGuest] = useState({ name: "", email: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  const image = config?.media.image;
  const video = config?.media.video;
  const mediaKinds = [
    image?.enabled ? { kind: "image" as const, limits: image } : null,
    video?.enabled ? { kind: "video" as const, limits: video } : null,
  ].filter((entry) => entry !== null);
  const accept = mediaKinds.flatMap((entry) => entry.limits.types ?? []).join(",");
  const uploading = state.files.some((file) => file.status === "uploading");
  const askGuest = !signedIn && Boolean(config?.guests_allowed);

  if (state.result) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.result.status === "approved" ? t.reviews.formApproved : t.reviews.formPending}</Alert>
        <Button onClick={onDone} className="self-end">
          {t.reviews.formClose}
        </Button>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const sent = await actions.submit(
      askGuest ? { author_name: guest.name.trim(), author_email: guest.email.trim() } : undefined,
    );
    if (sent) await queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
  };

  const errors = state.fieldErrors;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {config?.rating_enabled !== false ? (
        <StarInput value={state.rating} onChange={(rating) => actions.set({ rating })} error={errors.rating} />
      ) : null}

      {(config?.title_max_length ?? 0) > 0 ? (
        <Field label={t.reviews.formTitleField} error={errors.title}>
          <Input
            maxLength={config?.title_max_length}
            value={state.title}
            onChange={(event) => actions.set({ title: event.target.value })}
          />
        </Field>
      ) : null}

      <Field
        label={t.reviews.formContent}
        error={errors.content}
        hint={t.reviews.formContentHint(config?.content_min_length ?? 0)}
      >
        <Textarea
          rows={5}
          maxLength={config?.content_max_length || undefined}
          value={state.content}
          onChange={(event) => actions.set({ content: event.target.value })}
        />
      </Field>

      {mediaKinds.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t.reviews.formMedia}</p>
          <ul className="flex flex-wrap gap-2">
            {state.files.map((file) => (
              <UploadedFile key={file.id} file={file} onRemove={() => void actions.removeFile(file.id)} />
            ))}
            <li>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line-strong text-xs text-ink-muted transition-colors hover:border-brand hover:text-brand"
              >
                <ImagePlus className="size-5" aria-hidden />
                {t.reviews.formMediaAdd}
              </button>
            </li>
          </ul>
          <input
            ref={fileInput}
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) void actions.addFiles(files);
            }}
          />
          {mediaKinds.map(({ kind, limits }) => (
            <p key={kind} className="text-xs text-ink-muted">
              {t.reviews.formMediaHint(kind, limits.max_files ?? 0, formatBytes(limits.max_size ?? 0, storeLocale))}
            </p>
          ))}
          {state.files
            .filter((file) => file.error)
            .map((file) => (
              <p key={file.id} className="text-xs text-danger">
                {file.file.name ? `${file.file.name}: ` : ""}
                {formatError(file.error)}
              </p>
            ))}
          {errors.media ? <p className="text-xs text-danger">{errors.media}</p> : null}
        </div>
      ) : null}

      {askGuest ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.reviews.formName} error={errors.author_name}>
            <Input
              autoComplete="name"
              value={guest.name}
              onChange={(event) => setGuest((previous) => ({ ...previous, name: event.target.value }))}
            />
          </Field>
          <Field label={t.reviews.formEmail} error={errors.author_email} hint={t.reviews.formEmailHint}>
            <Input
              type="email"
              autoComplete="email"
              value={guest.email}
              onChange={(event) => setGuest((previous) => ({ ...previous, email: event.target.value }))}
            />
          </Field>
        </div>
      ) : null}

      {config?.allow_anonymous ? (
        <ChoiceLabel
          type="checkbox"
          checked={state.anonymous}
          onChange={(event) => actions.set({ anonymous: event.target.checked })}
        >
          {t.reviews.formAnonymous}
        </ChoiceLabel>
      ) : null}

      {state.error ? <Alert tone="danger">{formatError(state.error, "review")}</Alert> : null}

      <Button type="submit" loading={state.status === "submitting"} disabled={uploading} className="self-end">
        {t.reviews.formSubmit}
      </Button>
    </form>
  );
}

/** Asks the server whether this shopper can review, then shows the form or the reason. */
export function ReviewDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: number;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const hp = useHeadpress();
  const signedIn = useSignedIn();
  const pathname = usePathname();
  const eligibility = useQuery({
    // Apart from the `reviews` keys: publishing refreshes those, and the form must stay on its thanks.
    queryKey: ["review-eligibility", productId, signedIn],
    queryFn: () => hp.reviews.eligibility(productId),
    enabled: open,
    staleTime: 0,
  });

  const loginHref = `${paths.login}?next=${encodeURIComponent(`${pathname}?review=1`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t.reviews.formTitle} closeLabel={t.common.close}>
      {eligibility.isPending ? (
        <Spinner label={t.reviews.checking} />
      ) : eligibility.isError ? (
        <Alert tone="danger">{hp.formatError(eligibility.error)}</Alert>
      ) : eligibility.data.can_review ? (
        // Keyed by open state, so a second review starts from an empty form.
        <ReviewForm key={String(open)} productId={productId} onDone={() => onOpenChange(false)} />
      ) : (
        <div className="flex flex-col gap-4">
          <Alert tone="info">{eligibilityMessage(eligibility.data)}</Alert>
          {eligibility.data.reason === "login_required" ? (
            <Button asChild className="self-start">
              <Link href={loginHref}>{t.reviews.signIn}</Link>
            </Button>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
