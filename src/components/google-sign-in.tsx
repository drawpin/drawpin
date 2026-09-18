import { signInWithGoogle } from "@/app/auth/sign-in";
import { Button } from "@/components/ui/button";

/**
 * Signs a customer in with Google so they can compete and vote (ADR-004).
 * Drawing works without it, so this is never in anyone's way.
 *
 * @param next - The page to come back to afterwards.
 */
export function GoogleSignIn({
  next,
  label = "Sign in with Google",
  size = "lg",
}: {
  next: string;
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="outline" size={size} className="w-full">
        {label}
      </Button>
    </form>
  );
}
