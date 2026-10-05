import { signInWithGoogle } from "@/app/auth/sign-in";
import { EmailSignIn } from "@/components/email-sign-in";
import { Button } from "@/components/ui/button";

/**
 * Signs a customer in with Google so they can post, compete and vote
 * (ADR-004, ADR-007), with an emailed code underneath for anyone without a
 * Google account (ADR-010). Drawing for fun works without either.
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
    <div className="flex flex-col gap-2">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" size={size} className="w-full">
          {label}
        </Button>
      </form>
      <EmailSignIn next={next} />
    </div>
  );
}
