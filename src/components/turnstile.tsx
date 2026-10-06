"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      appearance: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile, proving a submission came from a browser rather than a
 * script (docs/PLAN.md, Device limiting).
 *
 * Invisible unless Cloudflare needs the visitor to do something: with
 * `interaction-only`, a Managed widget stays hidden while it checks, and
 * only shows its checkbox when a visitor looks suspicious. (Without it, the
 * widget always draws its box, "Success!" and all.) The token is single-use
 * and expires, so the widget refreshes itself and the form should submit the
 * value it last reported.
 */
export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const render = useCallback(() => {
    const api = window.turnstile;
    const container = containerRef.current;
    if (!api || !container || widgetIdRef.current) return;

    widgetIdRef.current = api.render(container, {
      sitekey: siteKey,
      appearance: "interaction-only",
      callback: (token) => onTokenRef.current(token),
      // A token lasts a few minutes; clear it so a stale one is never sent.
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
  }, [siteKey]);

  useEffect(() => {
    if (scriptReady) render();

    return () => {
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        window.turnstile.remove(id);
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, render]);

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
