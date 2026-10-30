"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Read by screen readers only, unless the panel shows it. */
  description?: string;
  closeLabel: string;
  className?: string;
  children: ReactNode;
}

const overlayClass = "fixed inset-0 z-50 bg-overlay animate-fade-in";

function CloseButton({ label }: { label: string }) {
  return (
    <RadixDialog.Close
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      <X className="size-5" aria-hidden />
    </RadixDialog.Close>
  );
}

/** A centered modal. */
export function Dialog({ open, onOpenChange, title, description, closeLabel, className, children }: OverlayProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClass} />
        <RadixDialog.Content
          className={cn(
            "fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 flex-col rounded-card bg-surface shadow-float animate-dialog-in",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4 px-5 pt-4">
            <RadixDialog.Title className="font-semibold">{title}</RadixDialog.Title>
            <CloseButton label={closeLabel} />
          </div>
          <RadixDialog.Description className="sr-only">{description ?? title}</RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** A panel that slides in from the right edge. */
export function Sheet({ open, onOpenChange, title, description, closeLabel, className, children }: OverlayProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClass} />
        <RadixDialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-float animate-sheet-in sm:rounded-l-sheet",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <RadixDialog.Title className="font-semibold">{title}</RadixDialog.Title>
            <CloseButton label={closeLabel} />
          </div>
          <RadixDialog.Description className="sr-only">{description ?? title}</RadixDialog.Description>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
