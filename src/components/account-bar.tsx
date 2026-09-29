import { signOutCustomer } from "@/app/auth/customer-actions";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customer";

/**
 * The way in for a guest, or out for a customer, as one small button in the
 * board's header under Draw. Always in the same place however many drawings
 * there are, and never a section of its own.
 *
 * Guests can draw for fun without an account; posting, voting and winning
 * need one (docs/PLAN.md, Accounts). The fuller invitation is on the draw
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
      <form action={signOutCustomer}>
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          title={`Signed in as ${customer.username}`}
          className="text-muted-foreground -mr-3.5"
        >
          Sign out
        </Button>
      </form>
    );
  }

  return (
    <GoogleSignIn
      next={next}
      size="sm"
      label="Sign in"
      variant="ghost"
      fullWidth={false}
      className="text-primary -mr-3.5"
    />
  );
}
