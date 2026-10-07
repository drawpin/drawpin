"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { renameBoardAction, type RenameBoardState } from "./actions";
import { INLINE_SAVE_ROOM, InlineSave } from "./inline-save";
import { nameChanged } from "./name-changed";

const initialState: RenameBoardState = { status: "idle" };

/**
 * Changes the name on the owner's board.
 *
 * Save shows inside the field once the name typed differs from the saved
 * one, and goes again if it's typed back. After a save the page brings the
 * new name, which then matches the field, so Save goes away by itself.
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
  const [typed, setTyped] = useState(name);
  const changed = nameChanged(typed, name);

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        // Enter on an unchanged name would save nothing.
        onSubmit={(event) => {
          if (!changed) event.preventDefault();
        }}
        className="flex flex-col gap-2"
      >
        <Label htmlFor="venue-name" className="sr-only">
          Board name
        </Label>
        <div className="relative">
          <Input
            id="venue-name"
            name="name"
            maxLength={120}
            required
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className={cn("h-14", changed && INLINE_SAVE_ROOM)}
          />
          {changed && <InlineSave label="name" pending={pending} />}
        </div>
        <p className="text-muted-foreground text-sm">
          This is the name everyone sees on your board. Your board link and QR
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
          <p role="status" className="text-muted-foreground text-sm">
            Your board is now called {state.name}. Links you&apos;ve already
            shared in chats may show the old name for a while. That&apos;s the
            chat app&apos;s saved preview, not your board, and anyone who taps
            one still lands here. Printed cards showing the old name are worth
            reprinting; the QR code on them still works.
          </p>
        )}
      </form>
    </div>
  );
}
