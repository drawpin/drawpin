import { signInWithGoogle } from "@/app/auth/sign-in";
import { Button } from "@/components/ui/button";

/**
 * Signs a customer in with Google so they can post, compete and vote
 * (ADR-004, ADR-007). Drawing for fun works without it.
 *
 * @param next - The page to come back to afterwards.
 */
export function GoogleSignIn({
  next,
  label = "Sign in with Google",
  size = "lg",
  fullWidth = true,
}: {
  next: string;
  label?: string;
  size?: "sm" | "lg";
  /** Off where the button sits beside text instead of below it. */
  fullWidth?: boolean;
}) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <Button
        type="submit"
        variant="outline"
        size={size}
        className={fullWidth ? "w-full" : undefined}
      >
        {label}
      </Button>
    </form>
  );
}
