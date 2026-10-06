"use client";

import { useActionState, useState } from "react";
import { CopyValue } from "@/components/copy-value";
import { Button } from "@/components/ui/button";
import { changeBoardLinkAction, type ChangeLinkState } from "./actions";

const initialState: ChangeLinkState = { status: "idle" };

/**
 * The board's link, and the way to change it once a rename has left it
 * carrying the old name (ADR-008).
 *
 * Changing it is offered only when the link and the name disagree: a fresh
 * suffix on an already-matching link gains nothing and costs a reprint. It
 * asks first, because the new link means a new QR code, even though the old
 * one keeps working.
 */
export function BoardLink({
  url,
  matchesName,
  nextUrl,
}: {
  url: string;
  /** Whether the link already reads as the board's current name. */
  matchesName: boolean;
  /** What the new link will look like, its random ending left as dots. */
  nextUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    changeBoardLinkAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-black tracking-tight">Board link</h2>
      <CopyValue
        value={url}
        name="board link"
        className="bg-muted rounded-lg px-3 py-2 font-mono text-sm break-all"
      />
      <p className="text-muted-foreground text-sm">
        People open this link by scanning the QR code. It doesn&apos;t change
        when you rename your board.
      </p>

      {state.status === "changed" && (
        <p role="status" className="text-muted-foreground text-sm">
          Done. The QR code above is the new one: download it and print it when
          you can. Old QR codes and links still work and bring people here.
        </p>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      {!matchesName && !confirming && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          Change link to match the name
        </Button>
      )}

      {!matchesName && confirming && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border p-3"
        >
          <p className="text-sm">
            Your link becomes{" "}
            <span className="font-mono break-all">{nextUrl}</span>
          </p>
          <ul className="text-muted-foreground list-disc pl-4 text-sm">
            <li>
              Your QR code changes too. Old ones and links already shared still
              work: they bring people to the new link.
            </li>
            <li>
              Reprint when you can, so the link people see has the new name.
            </li>
          </ul>
          <div className="flex gap-2">
            {/* Once it's changed, the link matches the name and this whole
                form goes away with the refreshed page. */}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Changing…" : "Change link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
