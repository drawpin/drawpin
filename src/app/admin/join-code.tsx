"use client";

import { useActionState, useState } from "react";
import { CopyValue } from "@/components/copy-value";
import { Button } from "@/components/ui/button";
import { newJoinCodeAction, type NewCodeState } from "./actions";

const initialState: NewCodeState = { status: "idle" };

/**
 * The board's 8-digit code, and the way to replace it (ADR-014).
 *
 * The code is permanent and printed on the table cards and posters, so a new
 * one means reprinting. It asks first, like changing the board link, because
 * the old code stops working the moment the new one is made.
 */
export function JoinCode({ code }: { code: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (): Promise<NewCodeState> => {
      const result = await newJoinCodeAction();
      if (result.status === "changed") setConfirming(false);
      return result;
    },
    initialState,
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-black tracking-tight">Board code</h2>
      <CopyValue
        value={code}
        name="code"
        className="border-foreground rounded-xl border-2 bg-white py-2 pl-4 font-mono text-xl font-bold tracking-[0.2em]"
      />
      <p className="text-muted-foreground text-xs">
        For anyone who can&apos;t scan: they type it on the DrawPin home page.
        It&apos;s on your printed cards and posters, and stays the same until
        you make a new one.
      </p>

      {state.status === "changed" && (
        <p role="status" className="text-muted-foreground text-sm">
          Done. The code above is the new one, and the old one no longer works.
          Reprint your table cards and posters, since they show the old code.
        </p>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      {!confirming && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          Make a new code
        </Button>
      )}

      {confirming && (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border p-3"
        >
          <p className="text-sm">Your board gets a new 8-digit code.</p>
          <ul className="text-muted-foreground list-disc pl-4 text-sm">
            <li>
              The current code stops working right away. Anyone who has it needs
              the new one.
            </li>
            <li>
              Cards and posters you&apos;ve printed show the old code, so
              reprint them. Your QR code and link don&apos;t change.
            </li>
          </ul>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Making…" : "Make new code"}
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
