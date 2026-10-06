import Link from "next/link";
import { signOutCustomer } from "@/app/auth/customer-actions";
import { GoogleSignIn } from "@/components/google-sign-in";
import type { Customer } from "@/lib/customer";

/** A quiet text button with a thumb-sized target, for the line below. */
const QUIET_BUTTON =
  "hover:text-foreground focus-visible:ring-highlight -mx-2 inline-flex min-h-11 cursor-pointer items-center rounded-full px-2 underline underline-offset-4 outline-none focus-visible:ring-3";

/**
 * Who's signed in, as one line of small print at the foot of the board: the
 * way in for a guest, and for a customer their drawings (to save them, or
 * delete their account, at `/account`) and the way out.
 *
 * Deliberately discreet (chosen 2026-09-28). Sign-in turns up where an
 * action needs an account, on Draw and Vote; this line is only for someone
 * who goes looking. A guest gets the Google button with the emailed-code
 * way in folded under it (ADR-010), so nobody needs a Google account.
 */
export function AccountLine({
  customer,
  next,
}: {
  customer: Customer | null;
  /** Where to land after signing in or out. */
  next: string;
}) {
  if (!customer) {
    return (
      <div className="flex justify-center">
        <GoogleSignIn next={next} label="Sign in" size="sm" />
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 text-sm">
      <span>
        Signed in as{" "}
        <span className="text-foreground font-medium">{customer.username}</span>
      </span>
      <Link
        href={`/account?next=${encodeURIComponent(next)}`}
        className={QUIET_BUTTON}
      >
        Your drawings
      </Link>
      <form action={signOutCustomer}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={QUIET_BUTTON}>
          Sign out
        </button>
      </form>
    </div>
  );
}
