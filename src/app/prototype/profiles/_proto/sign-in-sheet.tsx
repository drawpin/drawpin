"use client";

/**
 * PROTOTYPE ONLY (profiles design step, 2026-11-02): the universal sign-in
 * sheet, open over whatever page you were on. A sheet from the bottom on a
 * phone, a card in the middle on a laptop. Throwaway.
 */

import { useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "@phosphor-icons/react";
import { INKED_BUTTON } from "../../../b/[slug]/board-look";
import { NOTE } from "../../../_home/type";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function SignInSheet({ step }: { step: "start" | "code" }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="bg-foreground/40 fixed inset-0 z-40 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <Drawer.Popup className="border-foreground relative max-h-[92dvh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-2xl border-2 border-b-0 bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] motion-reduce:transition-none sm:max-w-sm sm:rounded-2xl sm:border-b-2 sm:pt-6 sm:shadow-[6px_6px_0_var(--primary)] sm:data-ending-style:[transform:translateY(16px)] sm:data-ending-style:opacity-0 sm:data-starting-style:[transform:translateY(16px)] sm:data-starting-style:opacity-0">
            <span
              aria-hidden
              className="bg-foreground/25 mx-auto mb-3 block h-1.5 w-10 rounded-full sm:hidden"
            />
            <Drawer.Close
              aria-label="Close"
              className="hover:bg-secondary focus-visible:ring-highlight absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-3 sm:top-3 sm:right-3"
            >
              <XIcon weight="bold" className="size-5" />
            </Drawer.Close>

            {step === "start" ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-3 pt-2 text-center">
                  <p className={NOTE}>Sign in</p>
                  <Drawer.Title className="text-3xl leading-tight font-black tracking-tight text-balance">
                    Keep your boards in one place
                  </Drawer.Title>
                  <Drawer.Description className="text-muted-foreground text-sm text-pretty">
                    Post your drawings, vote, and find your boards on any
                    device. Drawing for fun never needs it.
                  </Drawer.Description>
                </div>
                <button
                  type="button"
                  className="border-foreground hover:bg-secondary focus-visible:ring-highlight inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border-2 bg-white font-bold outline-none focus-visible:ring-3"
                >
                  <GoogleMark />
                  Continue with Google
                </button>
                <div
                  className="text-muted-foreground flex items-center gap-3 text-xs font-semibold"
                  aria-hidden
                >
                  <span className="bg-foreground/15 h-0.5 flex-1" />
                  or
                  <span className="bg-foreground/15 h-0.5 flex-1" />
                </div>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <label htmlFor="sheet-email" className="text-sm font-bold">
                    Email
                  </label>
                  <input
                    id="sheet-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="border-foreground focus-visible:ring-highlight -mt-1 h-12 rounded-xl border-2 bg-white px-3.5 outline-none focus-visible:ring-3"
                  />
                  <button type="submit" className={INKED_BUTTON}>
                    Email me a code
                  </button>
                </form>
                <p className="text-muted-foreground text-center text-xs">
                  You&apos;ll come back to Office Doodles.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-3 pt-2 text-center">
                  <p className={NOTE}>Check your email</p>
                  <Drawer.Title className="text-3xl leading-tight font-black tracking-tight text-balance">
                    Type the code
                  </Drawer.Title>
                  <Drawer.Description className="text-muted-foreground text-sm text-pretty">
                    We sent a 6-digit code to{" "}
                    <span className="text-foreground font-semibold">
                      ahmad@example.com
                    </span>
                    . It works for 1 hour.
                  </Drawer.Description>
                </div>
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <label htmlFor="sheet-code" className="sr-only">
                    Code
                  </label>
                  <input
                    id="sheet-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="border-foreground focus-visible:ring-highlight h-14 rounded-xl border-2 bg-white text-center text-2xl font-bold tracking-[0.35em] outline-none focus-visible:ring-3"
                  />
                  <button type="submit" className={INKED_BUTTON}>
                    Sign in
                  </button>
                </form>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground min-h-11 text-sm underline underline-offset-4"
                >
                  Use a different email
                </button>
              </div>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
