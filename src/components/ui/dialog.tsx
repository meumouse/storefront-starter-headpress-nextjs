"use client";

import { X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

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

let exitTransitions: boolean | undefined;

/**
 * Whether the browser keeps a closing `<dialog>` in the top layer while it transitions out.
 * Firefox parses `allow-discrete` without transitioning `display`, so probe instead of trusting
 * `CSS.supports`.
 */
function canTransitionOut(): boolean {
  if (exitTransitions !== undefined) return exitTransitions;
  if (!CSS.supports("overlay", "auto") || !CSS.supports("transition-behavior", "allow-discrete")) {
    return (exitTransitions = false);
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.append(probe);
  void getComputedStyle(probe).display;
  probe.style.display = "none";
  exitTransitions = getComputedStyle(probe).display === "block";
  probe.remove();
  return exitTransitions;
}

/** Only the dialog's own transitions: a spinner inside would never finish. */
async function transitionsSettled(element: HTMLElement) {
  const animations = element.getAnimations();
  if (animations.length === 0) return;
  await Promise.race([
    Promise.allSettled(animations.map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
}

function outside(event: PointerEvent, element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

type Phase = "closed" | "shell" | "open";

/**
 * Drives a native modal `<dialog>` from React state. The browser provides the inert page, focus
 * containment, Esc and back-gesture dismissal and focus return; this keeps it mounted long enough
 * to animate out and routes every native close request through `onOpenChange`.
 */
function useModal(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = useRef<HTMLDialogElement>(null);
  // "shell" opens the dialog before its content mounts, so `autoFocus` inside it lands on an
  // element that is already rendered instead of losing to the dialog's own initial focus.
  const [phase, setPhase] = useState<Phase>("closed");
  if (open && phase === "closed") setPhase("shell");

  const latest = useRef({ open, onOpenChange });
  useEffect(() => {
    latest.current = { open, onOpenChange };
  });

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.removeAttribute("data-closing");
    if (!dialog.open) dialog.showModal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the content must mount after showModal().
    if (phase === "shell") setPhase("open");
  }, [open, phase]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || open) return;
    let active = true;
    void (async () => {
      if (dialog.open && !canTransitionOut()) {
        dialog.setAttribute("data-closing", "");
        await transitionsSettled(dialog);
        if (!active) return;
      }
      dialog.close();
      await transitionsSettled(dialog);
      if (active) setPhase("closed");
    })();
    return () => {
      active = false;
    };
  }, [open, phase]);

  // Safari has no `closedby`: close on a press and release both outside the panel, so a text
  // selection that ends on the backdrop does not dismiss it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    let pressedOutside = false;
    const down = (event: PointerEvent) => {
      pressedOutside = outside(event, dialog);
    };
    const up = (event: PointerEvent) => {
      if (pressedOutside && outside(event, dialog)) latest.current.onOpenChange(false);
    };
    dialog.addEventListener("pointerdown", down);
    dialog.addEventListener("pointerup", up);
    return () => {
      dialog.removeEventListener("pointerdown", down);
      dialog.removeEventListener("pointerup", up);
    };
  }, [phase]);

  const dialogProps = {
    ref,
    closedby: "any" as const,
    // Esc, the back gesture and light dismiss: let the state close it, so it animates out.
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
      if (event.cancelable) event.preventDefault();
      onOpenChange(false);
    },
    // A close request the page could not cancel already closed it.
    onClose: () => {
      if (latest.current.open) latest.current.onOpenChange(false);
    },
  };

  return { mounted: phase !== "closed", contentReady: phase === "open", dialogProps };
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      <X className="size-5" aria-hidden />
    </button>
  );
}

function Overlay({
  variant,
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  className,
  children,
}: OverlayProps & { variant: "dialog" | "sheet" }) {
  const { mounted, contentReady, dialogProps } = useModal(open, onOpenChange);
  const titleId = useId();
  const descriptionId = useId();

  if (!mounted) return null;

  // Portalled to <body> so it never inherits text styles or sits inside a `display: none` parent.
  return createPortal(
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn("ds-overlay", variant === "dialog" ? "ds-dialog" : "ds-sheet", className)}
    >
      <div className={cn("flex flex-col", variant === "dialog" ? "max-h-[inherit]" : "h-full")}>
        <div
          className={cn(
            "flex items-center justify-between gap-4",
            variant === "dialog" ? "px-5 pt-4" : "border-b border-line px-5 py-3",
          )}
        >
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          <CloseButton label={closeLabel} onClick={() => onOpenChange(false)} />
        </div>
        <p id={descriptionId} className="sr-only">
          {description ?? title}
        </p>
        <div
          className={
            variant === "dialog" ? "min-h-0 flex-1 overflow-y-auto p-5" : "flex min-h-0 flex-1 flex-col"
          }
        >
          {contentReady ? children : null}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/** A centered modal. */
export function Dialog(props: OverlayProps) {
  return <Overlay variant="dialog" {...props} />;
}

/** A panel that slides in from the right edge. */
export function Sheet(props: OverlayProps) {
  return <Overlay variant="sheet" {...props} />;
}
