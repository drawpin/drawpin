"use client";

import { useActionState, useState } from "react";
import {
  type EmailSignInState,
  sendEmailCode,
  verifyEmailCode,
} from "@/app/auth/email-sign-in";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";

const idle: EmailSignInState = { status: "idle" };

/**
 * Signing in with an emailed code, for anyone without a Google
 * account or who'd rather not use it (ADR-010). Folded away behind one link
 * under the Google button, so it doesn't crowd the main way in.
 *
 * @param next - The page to come back to afterwards.
 */
export function EmailSignIn({ next }: { next: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [sent, send, sending] = useActionState(sendEmailCode, idle);
  const [checked, check, checking] = useActionState(verifyEmailCode, idle);
  // Lets "use a different email" go back a step without a server round trip.
  const [restart, setRestart] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground self-center text-xs underline underline-offset-4"
      >
        No Google account? Get a code by email
      </button>
    );
  }

  const email = sent.status === "sent" ? sent.email : null;

  if (email && restart === 0) {
    return (
      <form action={check} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Label htmlFor="email-code" className="text-sm">
          Enter the code we sent to {email}
        </Label>
        <Input
          id="email-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={13}
          required
          autoFocus
          className="text-center font-mono text-lg tracking-[0.4em]"
        />
        {checked.status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {checked.message}
          </p>
        )}
        <Button type="submit" size="sm" disabled={checking}>
          {checking ? "Checking…" : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={() => setRestart((count) => count + 1)}
          className="text-muted-foreground self-center text-xs underline underline-offset-4"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form
      action={(formData) => {
        setRestart(0);
        send(formData);
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="sign-in-email" className="text-sm">
        Email
      </Label>
      <Input
        id="sign-in-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      {sent.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {sent.message}
        </p>
      )}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />
      <Turnstile siteKey={siteKey} onToken={setToken} />
      <Button type="submit" size="sm" disabled={sending || !token}>
        {sending
          ? "Sending…"
          : token
            ? "Email me a code"
            : "Checking your browser…"}
      </Button>
    </form>
  );
}
