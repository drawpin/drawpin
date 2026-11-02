"use client";

import { useActionState, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INKED_BUTTON } from "../b/[slug]/board-look";
import { joinBoard } from "./actions";
import type { JoinState } from "./schema";

const initialState: JoinState = { status: "idle" };

/**
 * Opens a board by typing the code on the counter, instead of scanning.
 *
 * `compact` is the sidebar's version: the field and a short "Open" on one
 * 44px row. Ids come from `useId`, since the sidebar's form can be on the
 * same page as a full one.
 */
export function JoinForm({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const [state, formAction, pending] = useActionState(joinBoard, initialState);
  const id = useId();
  const codeId = `${id}-code`;
  const errorId = `${id}-error`;
  const compact = variant === "compact";

  const error = state.status === "error" && (
    <p id={errorId} role="alert" className="text-destructive text-sm">
      {state.message}
    </p>
  );

  const field = (
    <Input
      id={codeId}
      name="code"
      // A numeric keypad, but not type="number": the code can start with a
      // zero and isn't a quantity.
      inputMode="numeric"
      autoComplete="off"
      maxLength={11}
      placeholder="8-digit code"
      required
      // Big and spaced out, like the code on the card it's copied from.
      className={
        compact
          ? "border-foreground h-11 min-w-0 rounded-xl border-2 bg-white text-center font-bold tracking-[0.15em] placeholder:font-semibold placeholder:tracking-normal"
          : "border-foreground h-14 rounded-xl border-2 bg-white text-center text-2xl font-bold tracking-[0.2em] placeholder:text-base placeholder:font-semibold placeholder:tracking-normal"
      }
      aria-invalid={state.status === "error"}
      aria-describedby={state.status === "error" ? errorId : undefined}
    />
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {/* The heading above the form already asks for the code; the label is
          here for anyone who can't see that it does. */}
      <Label htmlFor={codeId} className="sr-only">
        Board code
      </Label>
      {compact ? (
        <div className="flex gap-2">
          {field}
          <button
            type="submit"
            disabled={pending}
            className={`${INKED_BUTTON} h-11 shrink-0 px-3 text-sm shadow-[3px_3px_0_var(--foreground)]`}
          >
            {pending ? "Opening…" : "Open"}
          </button>
        </div>
      ) : (
        field
      )}
      {error}
      {!compact && (
        <button
          type="submit"
          disabled={pending}
          className={`${INKED_BUTTON} h-14 text-lg`}
        >
          {pending ? "Opening…" : "Open the board"}
        </button>
      )}
    </form>
  );
}
