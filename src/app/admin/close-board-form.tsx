"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeBoardAction, type CloseBoardState } from "./actions";

const initialState: CloseBoardState = { status: "idle" };

/**
 * Closes the board for good (ADR-009). The last thing on the owner screen,
 * behind a first tap that only explains, and a second that needs the board's
 * name typed, because nothing about it can be undone.
 */
export function CloseBoardForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(
    closeBoardAction,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className="flex flex-col gap-2 border-t pt-6">
      <h2 className="text-sm font-medium">Close board</h2>
      <p className="text-muted-foreground text-xs">
        Deletes your board and everything on it, for good.
      </p>

      {open ? (
        <form
          action={formAction}
          className="border-destructive/40 flex flex-col gap-3 rounded-lg border p-3"
        >
          <ul className="list-disc pl-4 text-xs">
            <li>Every drawing, vote and report, and the Hall of Fame.</li>
            <li>
              Your board link and every QR code stop working, and the link can
              be given to a new board.
            </li>
            <li>Your sign-in. You can set up a new board later.</li>
          </ul>
          <div className="flex flex-col gap-1">
            <Label htmlFor="close-board-name" className="text-xs">
              {/* One span: Label spaces out its children as separate items. */}
              <span>
                Type <span className="font-semibold">{name}</span> to confirm
              </span>
            </Label>
            <Input
              id="close-board-name"
              name="name"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>

          {state.status === "error" && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={pending || typed.trim() === ""}
            >
              {pending ? "Closing…" : "Close board for good"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive self-start"
          onClick={() => setOpen(true)}
        >
          Close board…
        </Button>
      )}
    </section>
  );
}
