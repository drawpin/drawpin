"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeInput } from "@/components/code-input";
import { Label } from "@/components/ui/label";
import { useEmailCodeSignIn } from "@/components/use-email-code-sign-in";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";

/**
 * Signing in with an emailed code, for anyone without a Google
 * account or who'd rather not use it (ADR-010). Folded away behind one link
 * under the Google button, so it doesn't crowd the main way in. The sign-in
 * sheet and page (`SignInPanel`) show the same flow at full size.
 *
 * The code step reopens by itself for a while after a code is sent, since a
 * phone often reloads the page while its person reads their email, and
 * "Already have a code?" gets there from the email step too.
 *
 * @param next - The page to come back to afterwards.
 */
export function EmailSignIn({ next }: { next: string }) {
  const [open, setOpen] = useState(false);
  const flow = useEmailCodeSignIn();
  const emailInput = useRef<HTMLInputElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  if (!open && !flow.restored) {
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

  if (flow.codeEmail) {
    return (
      <form action={flow.submitCode} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={flow.codeEmail} />
        <input type="hidden" name="next" value={next} />
        <Label htmlFor="email-code" className="text-sm">
          Enter the code we sent to {flow.codeEmail}
        </Label>
        <CodeInput id="email-code" name="code" autoFocus />
        {flow.checkError && (
          <p role="alert" className="text-destructive text-sm">
            {flow.checkError}
          </p>
        )}
        <Button type="submit" size="sm" disabled={flow.checking}>
          {flow.checking ? "Checking…" : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={flow.useDifferentEmail}
          className="text-muted-foreground self-center text-xs underline underline-offset-4"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={flow.submitEmail} className="flex flex-col gap-2">
      <input type="hidden" name="next" value={next} />
      <Label htmlFor="sign-in-email" className="text-sm">
        Email
      </Label>
      <Input
        ref={emailInput}
        id="sign-in-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      {flow.sendError && (
        <p role="alert" className="text-destructive text-sm">
          {flow.sendError}
        </p>
      )}
      <input type="hidden" name={TURNSTILE_FIELD} value={flow.token ?? ""} />
      <Turnstile siteKey={siteKey} onToken={flow.setToken} />
      <Button type="submit" size="sm" disabled={flow.sending || !flow.token}>
        {flow.sending
          ? "Sending…"
          : flow.token
            ? "Email me a code"
            : "Checking your browser…"}
      </Button>
      <button
        type="button"
        onClick={() => {
          const input = emailInput.current;
          if (!input?.checkValidity()) {
            input?.reportValidity();
            return;
          }
          flow.haveCodeFor(input.value.trim().toLowerCase());
        }}
        className="text-muted-foreground self-center text-xs underline underline-offset-4"
      >
        Already have a code?
      </button>
    </form>
  );
}
