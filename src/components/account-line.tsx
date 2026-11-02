import Link from "next/link";
import { signOutCustomer } from "@/app/auth/customer-actions";
import { SIGN_IN_PILL } from "@/components/google-sign-in";
import { SignInButton } from "@/components/sign-in-sheet";
import type { Customer } from "@/lib/customer";

/** A quiet text button with a thumb-sized target, for the line below. */
const QUIET_BUTTON =
  "hover:text-foreground focus-visible:ring-highlight -mx-2 inline-flex min-h-11 cursor-pointer items-center rounded-full px-2 underline underline-offset-4 outline-none focus-visible:ring-3";

/**
 * Who's signed in, as one line of small print at the foot of the board: the
 * way in for a guest, and for a customer their drawings (to save them, on
 * their profile at `/me`) and the way out.
 *
 * Deliberately discreet (chosen 2026-09-28). Sign-in turns up where an
 * action needs an account, on Draw and Vote; this line is only for someone
 * who goes looking. A guest's "Sign in" opens the sign-in sheet, with Google
 * and an emailed code side by side (ADR-010), so nobody needs a Google
 * account.
 */
export function AccountLine({
  customer,
  next,
  returnTo,
}: {
  customer: Customer | null;
  /** Where to land after signing in or out. */
  next: string;
  /** What `next` is called in the sign-in sheet, such as the board's name. */
  returnTo?: string;
}) {
  if (!customer) {
    return (
      <div className="flex justify-center">
        <SignInButton next={next} returnTo={returnTo} className={SIGN_IN_PILL}>
          Sign in
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 text-sm">
      <span>
        Signed in as{" "}
        <span className="text-foreground font-medium">{customer.username}</span>
      </span>
      <Link href="/me#drawings" className={QUIET_BUTTON}>
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
