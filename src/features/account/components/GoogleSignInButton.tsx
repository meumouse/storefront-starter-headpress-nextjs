"use client";

/**
 * Google's own button (Google Identity Services). Google hands back an ID token, which Headpress
 * verifies against the client id it publishes in `modules.google_sign_in`, so the button only shows
 * while that module is on: a token from any other client would be refused.
 */
import { useCapability, useFormatError, useHeadpress } from "@meumouse.com/headpress/react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { storeLocale, t } from "@/i18n";

interface GsiButtonOptions {
  type: "standard";
  theme: "outline";
  size: "large";
  text: "signin_with" | "signup_with" | "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  width: number;
  locale: string;
}

interface GsiId {
  initialize(config: {
    client_id: string;
    callback(response: { credential?: string }): void;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GsiButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client";
let script: Promise<GsiId> | null = null;

/** The Google script, loaded once for every button on the page. */
function loadGoogleIdentity(): Promise<GsiId> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  script ??= new Promise<GsiId>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = SCRIPT_URL;
    element.async = true;
    element.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google Identity Services did not start."));
    };
    element.onerror = () => {
      script = null;
      reject(new Error("Google Identity Services did not load."));
    };
    document.head.append(element);
  });
  return script;
}

export function GoogleSignInButton({
  text = "signin_with",
  onSignedIn,
  onCredential,
}: {
  text?: GsiButtonOptions["text"];
  /** After Headpress signed the shopper in. */
  onSignedIn?(): void | Promise<void>;
  /** Take the credential instead of signing in (linking a Google account to the signed-in customer). */
  onCredential?(credential: string): Promise<void>;
}) {
  const hp = useHeadpress();
  const formatError = useFormatError();
  const clientId = useCapability("google_sign_in")?.client_id?.trim() ?? "";
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [error, setError] = useState<string | null>(null);

  // Google keeps the first callback it was given; this ref always holds the current handlers.
  const latest = useRef({ onSignedIn, onCredential });
  useEffect(() => {
    latest.current = { onSignedIn, onCredential };
  });

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const handle = async ({ credential }: { credential?: string }) => {
      if (!credential) {
        setError(t.signIn.googleCancelled);
        return;
      }
      setError(null);
      try {
        if (latest.current.onCredential) {
          await latest.current.onCredential(credential);
        } else {
          await hp.auth.google(credential);
          await latest.current.onSignedIn?.();
        }
      } catch (failure) {
        setError(formatError(failure, "login"));
      }
    };

    loadGoogleIdentity()
      .then((id) => {
        const parent = container.current;
        if (cancelled || !parent) return;
        id.initialize({ client_id: clientId, callback: (response) => void handle(response), cancel_on_tap_outside: true });
        parent.replaceChildren();
        id.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          // Google wants pixels, at most 400.
          width: Math.min(400, parent.clientWidth || 320),
          locale: storeLocale,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text, hp, formatError]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={container} className="flex min-h-10 justify-center" />
      {status === "loading" ? <p className="text-center text-xs text-ink-muted">{t.signIn.googleLoading}</p> : null}
      {status === "failed" ? <Alert tone="warning">{t.signIn.googleFailed}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

/** "or" between Google and the other ways in. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {t.signIn.orDivider}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
