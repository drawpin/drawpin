"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "@phosphor-icons/react";
import { SignInPanel } from "@/components/sign-in-panel";
import { safeNextPath } from "@/lib/next-path";

/**
 * The universal sign-in (docs/design/profiles.md section 6): a sheet rising
 * from the bottom on a phone, a card in the middle from `sm` up. Google and
 * an emailed code carry equal weight, and either returns to `next`.
 *
 * Base UI's Drawer supplies the focus trap, Escape to close, focus returning
 * to whatever opened it, and swipe-down to dismiss; the motion switches off
 * under reduced motion.
 *
 * Most callers want {@link SignInButton}, which holds the open state. Use
 * this directly to open the sheet from something that isn't a button, such as
 * a guest's Post tap.
 *
 * @param next - The page to come back to afterwards. Anything that isn't a
 *   plain path on this site becomes `/`.
 * @param returnTo - What `next` is called in the small print, such as a
 *   board's name; omit for "this page".
 */
export function SignInSheet({
  next,
  returnTo,
  open,
  onOpenChange,
}: {
  next: string;
  returnTo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="bg-foreground/40 fixed inset-0 z-40 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <Drawer.Popup
            // The sheet can open from inside a page's form; React would hand
            // its forms' submits up to that one through the portal.
            onSubmit={(event) => event.stopPropagation()}
            className="border-foreground relative max-h-[92dvh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-2xl border-2 border-b-0 bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] motion-reduce:transition-none sm:max-w-sm sm:rounded-2xl sm:border-b-2 sm:pt-6 sm:shadow-[6px_6px_0_var(--primary)] sm:data-ending-style:[transform:translateY(16px)] sm:data-ending-style:opacity-0 sm:data-starting-style:[transform:translateY(16px)] sm:data-starting-style:opacity-0"
          >
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
            <SignInPanel
              next={safeNextPath(next)}
              returnTo={returnTo}
              variant="sheet"
            />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/**
 * A button that opens the sign-in sheet, returning to the page it was tapped
 * on (its path and search): the "Sign in" on board pages. (The sidebar opens
 * the sheet itself, outside its drawer, since the drawer closes as the sheet
 * opens and would take a sheet inside it away.)
 *
 * It takes the button's look from the caller, and the page to return to is
 * read when it's tapped, so it works on any page without a `next` prop. The
 * sheet is mounted only once first opened, so a page that shows many of these
 * pays nothing for it.
 *
 * @param children - The label.
 * @param className - The button's classes.
 * @param next - Return somewhere other than the current page.
 * @param returnTo - What the return page is called in the sheet's small print.
 * @param onOpen - Called as the sheet opens, such as to close a menu around it.
 */
export function SignInButton({
  children,
  className,
  next,
  returnTo,
  onOpen,
}: {
  children: ReactNode;
  className?: string;
  next?: string;
  returnTo?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Mounted at the first tap and kept, so closing can animate and focus can
  // return to the button.
  const [used, setUsed] = useState(false);
  const [target, setTarget] = useState("/");

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => {
          setTarget(next ?? `${location.pathname}${location.search}`);
          setUsed(true);
          setOpen(true);
          onOpen?.();
        }}
      >
        {children}
      </button>
      {used && (
        <SignInSheet
          next={target}
          returnTo={returnTo}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
