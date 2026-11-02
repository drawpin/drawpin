"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  hasUnsavedDrawing,
  setUnsavedDrawing,
} from "@/app/b/[slug]/draw/unsaved-drawing";

type Guard = { leaveTo: (href: string) => void; onNavigate?: () => void };

const GuardContext = createContext<Guard>({ leaveTo: () => {} });

/**
 * Asks "Leave this drawing?" before a sidebar link leaves the draw step with
 * a drawing that hasn't been posted, as its own back button does
 * (`BackToBoard`). Everywhere else the links just go.
 *
 * @param onNavigate - Called as any link is followed, to close the drawer.
 */
export function LeaveGuard({
  onNavigate,
  children,
}: {
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  return (
    <GuardContext.Provider value={{ leaveTo: setPending, onNavigate }}>
      {children}
      <AlertDialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="bg-foreground/30 fixed inset-0 z-[70] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <AlertDialog.Popup className="bg-background shadow-lift fixed top-1/2 left-1/2 z-[70] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <AlertDialog.Title className="text-lg font-bold">
              Leave this drawing?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-muted-foreground mt-1 text-sm">
              It hasn&apos;t been posted, so leaving throws it away.
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Close
                className={buttonVariants({ variant: "ghost" })}
              >
                Keep drawing
              </AlertDialog.Close>
              <button
                type="button"
                className={buttonVariants({ variant: "destructive" })}
                onClick={() => {
                  const href = pending;
                  setPending(null);
                  if (!href) return;
                  // Leaving on purpose: no second warning from the browser.
                  setUnsavedDrawing(false);
                  onNavigate?.();
                  router.push(href);
                }}
              >
                Leave
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </GuardContext.Provider>
  );
}

/** A sidebar link: closes the drawer, and asks first on the draw step. */
export function GuardedLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const guard = useContext(GuardContext);
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (hasUnsavedDrawing()) {
          event.preventDefault();
          guard.leaveTo(href);
          return;
        }
        guard.onNavigate?.();
      }}
      {...props}
    />
  );
}
