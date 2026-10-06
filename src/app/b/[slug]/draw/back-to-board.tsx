"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { setUnsavedDrawing, useUnsavedDrawing } from "./unsaved-drawing";

const BACK = buttonVariants({ variant: "outline", size: "icon" });

/**
 * The draw screen's way back to the board. With nothing drawn it simply goes
 * back; with a drawing that hasn't been posted it asks first, since leaving
 * throws the drawing away.
 *
 * The question is a modal: it's the one moment where a mistaken tap costs
 * someone their work. It fades in with a small scale from the middle, and
 * out a little faster; instant for anyone who asks for reduced motion.
 */
export function BackToBoard({ href }: { href: string }) {
  const unsaved = useUnsavedDrawing();
  const router = useRouter();

  if (!unsaved) {
    return (
      <Link
        href={href}
        aria-label="Back to the board"
        title="Back to the board"
        className={BACK}
      >
        <ArrowLeftIcon weight="bold" />
      </Link>
    );
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        aria-label="Back to the board"
        title="Back to the board"
        className={BACK}
      >
        <ArrowLeftIcon weight="bold" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="bg-foreground/30 fixed inset-0 z-50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <AlertDialog.Popup className="bg-background shadow-lift fixed top-1/2 left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <AlertDialog.Title className="text-lg font-bold">
            Leave this drawing?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-muted-foreground mt-1 text-sm">
            It hasn&apos;t been posted, so going back throws it away.
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close className={buttonVariants({ variant: "ghost" })}>
              Keep drawing
            </AlertDialog.Close>
            <button
              type="button"
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                // Leaving on purpose: no second warning from the browser.
                setUnsavedDrawing(false);
                router.push(href);
              }}
            >
              Leave
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
