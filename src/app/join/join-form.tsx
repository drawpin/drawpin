"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INKED_BUTTON } from "../b/[slug]/board-look";
import { joinBoard } from "./actions";
import type { JoinState } from "./schema";

const initialState: JoinState = { status: "idle" };

/** Opens a board by typing the code on the counter, instead of scanning. */
export function JoinForm() {
  const [state, formAction, pending] = useActionState(joinBoard, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {/* The heading above the form already asks for the code; the label is
          here for anyone who can't see that it does. */}
      <Label htmlFor="code" className="sr-only">
        Board code
      </Label>
      <Input
        id="code"
        name="code"
        // A numeric keypad, but not type="number": the code can start with a
        // zero and isn't a quantity.
        inputMode="numeric"
        autoComplete="off"
        maxLength={11}
        placeholder="8-digit code"
        required
        // Big and spaced out, like the code on the card it's copied from.
        className="border-foreground h-14 rounded-xl border-2 bg-white text-center text-2xl font-bold tracking-[0.2em] placeholder:text-base placeholder:font-semibold placeholder:tracking-normal"
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "code-error" : undefined}
      />
      {state.status === "error" && (
        <p id="code-error" role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`${INKED_BUTTON} h-14 text-lg`}
      >
        {pending ? "Opening…" : "Open the board"}
      </button>
    </form>
  );
}
