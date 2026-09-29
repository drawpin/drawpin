"use client";

import { GoogleLogoIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** The two labels share one spot and cross-fade, like an icon swap. */
const LABEL =
  "col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none";
const HIDDEN_ABOVE = "-translate-y-2 opacity-0 blur-sm";
const HIDDEN_BELOW = "translate-y-2 opacity-0 blur-sm";

/**
 * A guest's Post button. Guests can't post (ADR-007), so the first tap turns
 * it into "Sign in to post" instead of posting: the label slides away and the
 * sign-in one slides in, so it reads as the same button changing its mind
 * rather than a new thing appearing. The second tap signs in.
 *
 * The button can't hold the sign-in form (it's inside the drawing's form), so
 * the second tap submits the one named by `formId`. It stays a plain button
 * throughout: turning it into a submit button on the first tap would make
 * that same tap submit, because React applies the change before the browser
 * finishes handling the click.
 */
export function GuestPostButton({
  formId,
  disabled,
  onAsk,
  onSignIn,
}: {
  /** The sign-in form the second tap submits. */
  formId: string;
  disabled: boolean;
  /** The first tap. Returns false when there's nothing to post yet. */
  onAsk: () => boolean;
  /** Just before leaving for Google: keep the drawing. */
  onSignIn: () => void;
}) {
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          if (!asking) {
            if (onAsk()) setAsking(true);
            return;
          }
          onSignIn();
          const form = document.getElementById(formId);
          if (form instanceof HTMLFormElement) form.requestSubmit();
        }}
      >
        <span className="grid">
          <span
            aria-hidden={asking}
            className={`${LABEL} ${asking ? HIDDEN_ABOVE : ""}`}
          >
            Post my tile
          </span>
          <span
            aria-hidden={!asking}
            className={`${LABEL} ${asking ? "" : HIDDEN_BELOW}`}
          >
            <GoogleLogoIcon weight="bold" />
            Sign in to post
          </span>
        </span>
      </Button>
      {asking && (
        <p className="text-muted-foreground motion-safe:animate-fade-up text-center text-sm">
          Posting needs a Google sign-in. Your drawing will be right here when
          you&apos;re back.
        </p>
      )}
    </div>
  );
}
