"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinBoard } from "./actions";
import type { JoinState } from "./schema";

const initialState: JoinState = { status: "idle" };

/** Opens a board by typing the code on the counter, instead of scanning. */
export function JoinForm() {
  const [state, formAction, pending] = useActionState(joinBoard, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <Label htmlFor="code">Have a code?</Label>
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
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "code-error" : undefined}
      />
      {state.status === "error" && (
        <p id="code-error" role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Opening…" : "Open the board"}
      </Button>
    </form>
  );
}
