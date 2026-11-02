"use client";

import type { ComponentProps } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { CodeInput } from "@/components/code-input";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmailCodeSignIn } from "@/components/use-email-code-sign-in";
import { NOTE } from "@/app/_home/type";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";

/** The sheet's dialog title, so a screen reader announces it. */
function SheetTitle(props: ComponentProps<"h2">) {
  return <Drawer.Title {...props} />;
}

function SheetDescription(props: ComponentProps<"p">) {
  return <Drawer.Description {...props} />;
}

function PageTitle(props: ComponentProps<"h1">) {
  return <h1 {...props} />;
}

function PageDescription(props: ComponentProps<"p">) {
  return <p {...props} />;
}

const TITLE_CLASS =
  "text-3xl leading-tight font-black tracking-tight text-balance";
const DESCRIPTION_CLASS = "text-muted-foreground text-sm text-pretty";

/**
 * The content of the universal sign-in (docs/design/profiles.md section 6),
 * shared by the sheet (`SignInSheet`) and the full page (`/login`) so the two
 * can't drift: Google and an emailed code with equal weight, then the code
 * step. Signing in with either way returns to `next`; a first-time account
 * goes through /welcome to pick a name on the way (ADR-013, ADR-016).
 *
 * @param next - Where to come back to; checked again on the server.
 * @param returnTo - What `next` is called in the small print, such as a
 *   board's name. Omit it for "this page".
 * @param variant - `sheet` makes the heading and description the dialog's
 *   title and description (it must sit inside a Drawer); `page` makes the
 *   heading the page's `h1`.
 */
export function SignInPanel({
  next,
  returnTo,
  variant,
}: {
  next: string;
  returnTo?: string;
  variant: "sheet" | "page";
}) {
  const Title = variant === "sheet" ? SheetTitle : PageTitle;
  const Description = variant === "sheet" ? SheetDescription : PageDescription;
  const flow = useEmailCodeSignIn();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  if (flow.codeEmail) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <p className={NOTE}>Check your email</p>
          <Title className={TITLE_CLASS}>Type the code</Title>
          <Description className={DESCRIPTION_CLASS}>
            We sent a code to{" "}
            <span className="text-foreground font-semibold break-all">
              {flow.codeEmail}
            </span>
            . It works for 15 minutes.
          </Description>
        </div>
        <form action={flow.submitCode} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={flow.codeEmail} />
          <input type="hidden" name="next" value={next} />
          <Label htmlFor="sign-in-code" className="sr-only">
            Code
          </Label>
          <CodeInput
            id="sign-in-code"
            name="code"
            autoFocus
            aria-invalid={flow.checkError !== null}
            aria-describedby={flow.checkError ? "sign-in-error" : undefined}
          />
          {flow.checkError && (
            <p
              id="sign-in-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {flow.checkError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={flow.checking}>
            {flow.checking ? "Checking…" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          onClick={flow.useDifferentEmail}
          className="text-muted-foreground hover:text-foreground min-h-11 text-sm underline underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <p className={NOTE}>Sign in</p>
        <Title className={TITLE_CLASS}>Keep your boards in one place</Title>
        <Description className={DESCRIPTION_CLASS}>
          Post your drawings, vote, and find your boards on any device. Drawing
          for fun never needs it.
        </Description>
      </div>
      <GoogleSignIn
        next={next}
        size="block"
        label="Continue with Google"
        withEmail={false}
      />
      <div
        className="text-muted-foreground flex items-center gap-3 text-xs font-semibold"
        aria-hidden
      >
        <span className="bg-foreground/15 h-0.5 flex-1" />
        or
        <span className="bg-foreground/15 h-0.5 flex-1" />
      </div>
      <form action={flow.submitEmail} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <Label htmlFor="sign-in-email" className="font-bold">
          Email
        </Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          aria-invalid={flow.sendError !== null}
          aria-describedby={flow.sendError ? "sign-in-error" : undefined}
        />
        {flow.sendError && (
          <p
            id="sign-in-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {flow.sendError}
          </p>
        )}
        <input type="hidden" name={TURNSTILE_FIELD} value={flow.token ?? ""} />
        <Turnstile siteKey={siteKey} onToken={flow.setToken} />
        <Button type="submit" size="lg" disabled={flow.sending || !flow.token}>
          {flow.sending
            ? "Sending…"
            : flow.token
              ? "Email me a code"
              : "Checking your browser…"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-xs">
        You&apos;ll come back to {returnTo ?? "this page"}.
      </p>
    </div>
  );
}
