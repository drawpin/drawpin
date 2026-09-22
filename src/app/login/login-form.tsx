"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/turnstile";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { sendMagicLink } from "./actions";
import type { LoginState } from "./schema";

const initialState: LoginState = { status: "idle" };

export function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-2 text-center">
        <p>
          Check <span className="font-medium">{state.email}</span> for a sign-in
          link. It expires in 15 minutes.
        </p>
        <p className="text-muted-foreground text-sm">
          It works wherever you open it — this browser, your phone, or the one
          inside your email app.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "email-error" : undefined}
      />
      {state.status === "error" && (
        <p id="email-error" role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />
      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} />
      <Button type="submit" size="lg" disabled={pending || !token}>
        {pending
          ? "Sending…"
          : token
            ? "Email me a sign-in link"
            : "Checking your browser…"}
      </Button>
    </form>
  );
}
