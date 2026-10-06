"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/turnstile";
import {
  clearPendingEmail,
  readPendingEmail,
  savePendingEmail,
} from "@/lib/pending-email-code";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { sendMagicLink, verifyOwnerCode } from "./actions";
import type { CodeState, LoginState } from "./schema";

const initialState: LoginState = { status: "idle" };
const initialCode: CodeState = { status: "idle" };

/**
 * The owner's sign-in: an email with both a link and a code. The code step
 * comes back after a reload for as long as the code lasts, since a phone
 * often reloads the page while its owner reads the email (ADR-010).
 */
export function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );
  const [checked, check, checking] = useActionState(
    verifyOwnerCode,
    initialCode,
  );
  // An address sent an email before this page loaded.
  const [earlier, setEarlier] = useState<string | null>(null);

  useEffect(() => {
    const waiting = readPendingEmail("owner");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
    if (waiting) setEarlier(waiting);
  }, []);

  useEffect(() => {
    if (state.status === "sent") savePendingEmail(state.email, "owner");
  }, [state]);

  const email = state.status === "sent" ? state.email : earlier;

  useEffect(() => {
    if (checked.status === "error" && email) savePendingEmail(email, "owner");
  }, [checked, email]);

  if (email) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-center">
          We sent a sign-in email to{" "}
          <span className="font-medium">{email}</span>. Type the code from it
          here, or tap its link. Both expire in 15 minutes.
        </p>
        <form
          action={(formData) => {
            // Signing in leaves the page; a wrong code puts the address back.
            clearPendingEmail("owner");
            check(formData);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="email" value={email} />
          <Label htmlFor="owner-code">Code</Label>
          <Input
            id="owner-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={13}
            required
            autoFocus
            aria-invalid={checked.status === "error"}
            aria-describedby={
              checked.status === "error" ? "code-error" : undefined
            }
            className="text-center font-mono text-lg tracking-[0.4em]"
          />
          {checked.status === "error" && (
            <p
              id="code-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {checked.message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={checking}>
            {checking ? "Checking…" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            clearPendingEmail("owner");
            window.location.reload();
          }}
          className="text-muted-foreground self-center text-sm underline underline-offset-4"
        >
          Send to a different email
        </button>
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
            ? "Email me a sign-in code"
            : "Checking your browser…"}
      </Button>
    </form>
  );
}
