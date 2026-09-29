import { signOutCustomer } from "@/app/auth/customer-actions";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customer";

/**
 * Who the visitor is on this board, and the way in if they're a guest.
 *
 * Guests can draw for fun without it; posting, voting and winning need an
 * account (docs/PLAN.md, Accounts).
 *
 * One line near the top of the board either way, so it's in the same place
 * however many drawings there are. The fuller invitation is on the draw
 * screen (SignInFirst), where a guest meets it before drawing, and on the
 * vote page.
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
    <div className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
      <span>Sign in to post, vote and win.</span>
      <GoogleSignIn next={next} size="sm" label="Sign in" fullWidth={false} />
    </div>
  );
}
