"use client";

import { useState } from "react";
import { SignInSheet } from "@/components/sign-in-sheet";
import { Button } from "@/components/ui/button";

/**
 * A guest's Post button. Guests can't post (ADR-007), so tapping it keeps
 * the drawing and opens the sign-in sheet instead; signing in, with Google
 * or an emailed code, returns to this same draw page and puts the drawing
 * back (draft.ts).
 *
 * @param next - The draw page to come back to.
 * @param returnTo - The board's name, for the sheet's small print.
 * @param onAsk - Called on the tap. Returns false when there's nothing to
 *   post yet, and the sheet stays shut.
 * @param onSignIn - Just before the sheet opens: keep the drawing, since the
 *   trip to Google leaves the page.
 */
export function GuestPostButton({
  next,
  returnTo,
  disabled,
  onAsk,
  onSignIn,
}: {
  next: string;
  returnTo?: string;
  disabled: boolean;
  onAsk: () => boolean;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => {
          if (!onAsk()) return;
          onSignIn();
          setOpen(true);
        }}
      >
        Post my tile
      </Button>
      <SignInSheet
        next={next}
        returnTo={returnTo}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
