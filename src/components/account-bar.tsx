import { signOutCustomer } from "@/app/auth/customer-actions";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customer";

/**
 * Who the visitor is on this board, and the way in if they're a guest.
 *
 * Guests can draw perfectly well, so this never blocks anything — it's the
 * nudge for the things an account unlocks (docs/PLAN.md, Accounts).
 */
export function AccountBar({
  customer,
  next,
}: {
  customer: Customer | null;
  next: string;
}) {
  if (customer) {
    return (
      <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
        <span>
          Drawing as <span className="font-medium">{customer.username}</span>
        </span>
        <form action={signOutCustomer}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
      <p className="text-sm font-medium">Want to be in the running?</p>
      <p className="text-muted-foreground text-xs">
        Anyone can draw. Signing in lets your tile be voted for, and lets you
        vote on last week&apos;s board from any device.
      </p>
      <GoogleSignIn next={next} size="sm" />
    </div>
  );
}
