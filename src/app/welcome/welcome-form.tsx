"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chooseUsername } from "./actions";
import type { WelcomeState } from "./schema";

const initialState: WelcomeState = { status: "idle" };

/** Asks a new customer what to draw under, once, on their first sign-in. */
export function WelcomeForm({
  next,
  suggestion,
}: {
  next: string;
  suggestion: string;
}) {
  const [state, formAction, pending] = useActionState(
    chooseUsername,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <Label htmlFor="username">Your name on the board</Label>
      <Input
        id="username"
        name="username"
        defaultValue={suggestion}
        maxLength={40}
        autoComplete="nickname"
        required
        aria-invalid={state.status === "error"}
        aria-describedby={
          state.status === "error" ? "username-error" : undefined
        }
      />
      {state.status === "error" && (
        <p
          id="username-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {state.message}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Names aren&apos;t unique, so yours shows with a 4-digit tag, like
        Ahmad#4821.
      </p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Start drawing"}
      </Button>
    </form>
  );
}
