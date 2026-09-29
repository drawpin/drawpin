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
  variant = "outline",
  className,
}: {
  next: string;
  label?: string;
  size?: "sm" | "lg";
  /** Off where the button sits beside text instead of below it. */
  fullWidth?: boolean;
  /** Ghost where it's a quiet link in a header rather than a call to action. */
  variant?: "outline" | "ghost";
  className?: string;
}) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <Button
        type="submit"
        variant={variant}
        size={size}
        className={[fullWidth ? "w-full" : null, className]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </Button>
    </form>
  );
}
