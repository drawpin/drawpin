import { signOutCustomer } from "@/app/auth/customer-actions";
import { signInWithGoogle } from "@/app/auth/sign-in";
import type { Customer } from "@/lib/customer";

/** A quiet text button with a thumb-sized target, for the line below. */
const QUIET_BUTTON =
  "hover:text-foreground focus-visible:ring-highlight -mx-2 inline-flex min-h-11 cursor-pointer items-center rounded-full px-2 underline underline-offset-4 outline-none focus-visible:ring-3";

/**
 * Who's signed in, as one line of small print at the foot of the board: the
 * way in for a guest, the way out for a customer.
 *
 * Deliberately discreet (chosen 2026-09-28). Sign-in turns up where an
 * action needs an account, on Draw and Vote; this line is only for someone
 * who goes looking.
 */
export function AccountLine({
  customer,
  next,
}: {
  customer: Customer | null;
  /** Where to land after signing in or out. */
  next: string;
}) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
      {customer ? (
        <>
          <span>
            Signed in as{" "}
            <span className="text-foreground font-medium">
              {customer.username}
            </span>
            {" ·"}
          </span>
          <form action={signOutCustomer}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={QUIET_BUTTON}>
              Sign out
            </button>
          </form>
        </>
      ) : (
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={QUIET_BUTTON}>
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
