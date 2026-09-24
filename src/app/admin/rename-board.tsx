"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameBoardAction, type RenameBoardState } from "./actions";

const initialState: RenameBoardState = { status: "idle" };

/**
 * Changes the name on the owner's board.
 *
 * The help text is the point of the section as much as the field is: an owner
 * about to rename is bracing for a reprint, and the answer is that there
 * isn't one (issue #105).
 */
export function RenameBoard({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(
    renameBoardAction,
    initialState,
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Board name</h2>
      <form action={formAction} className="flex flex-col gap-2">
        <Label htmlFor="venue-name" className="sr-only">
          Venue name
        </Label>
        <Input
          id="venue-name"
          name="name"
          maxLength={120}
          required
          defaultValue={name}
        />
        <p className="text-muted-foreground text-xs">
          This is the name customers see on your board. Your board link and QR
          code stay the same, so anything you&apos;ve already printed keeps
          working.
        </p>

        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {state.message}
          </p>
        )}

        {/* Said afterwards, not in the form: it's a consequence to know about,
            not a reason to decide differently. */}
        {state.status === "renamed" && (
          <p role="status" className="text-muted-foreground text-xs">
            Your board is now called {state.name}. Links you&apos;ve already
            shared in chats may show the old name for a while — that&apos;s the
            chat app&apos;s saved preview, not your board, and anyone who taps
            one still lands here. Printed cards showing the old name are worth
            reprinting; the QR code on them still works.
          </p>
        )}

        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save name"}
        </Button>
      </form>
    </section>
  );
}
