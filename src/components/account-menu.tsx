"use client";

import { Popover } from "@base-ui/react/popover";
import { signOutCustomer } from "@/app/auth/customer-actions";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customer";

/**
 * The signed-in customer's avatar in the board's header: their initial in a
 * circle, which opens their name and Sign out.
 *
 * Guests get nothing here. They meet sign-in where an action needs an
 * account (Draw, Vote), so the board itself stays about the drawings
 * (chosen 2026-09-28).
 *
 * The menu grows from the avatar and fades out a little faster than it came
 * in: it's opened now and then, so the motion is small, and it's instant for
 * anyone who asks for reduced motion.
 */
export function AccountMenu({
  customer,
  next,
}: {
  customer: Customer;
  /** Where to land after signing out. */
  next: string;
}) {
  const initial = customer.username.trim().charAt(0).toUpperCase() || "?";

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Your account, ${customer.username}`}
        className="bg-secondary text-primary focus-visible:ring-highlight grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-base font-bold transition-transform duration-100 ease-out outline-none focus-visible:ring-3 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {initial}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="bg-background shadow-lift origin-(--transform-origin) rounded-2xl border p-3 transition-[transform,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="text-muted-foreground px-1 text-sm">
              Signed in as{" "}
              <span className="text-foreground font-semibold">
                {customer.username}
              </span>
            </Popover.Title>
            <form action={signOutCustomer} className="mt-2">
              <input type="hidden" name="next" value={next} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sign out
              </Button>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
