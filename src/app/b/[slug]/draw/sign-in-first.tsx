import { GoogleSignIn } from "@/components/google-sign-in";

/**
 * The way from drawing for fun to posting, shown to guests above the canvas.
 *
 * Only an account can post (ADR-007), and signing in leaves the page for
 * Google, which loses whatever is on the canvas. So this sits in front of the
 * canvas, where it's seen before anything is drawn, rather than under it.
 */
export function SignInFirst({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
      <p className="text-sm font-medium">Sign in to post</p>
      <p className="text-muted-foreground text-xs">
        As a guest you can draw as much as you like, but nothing goes on the
        board. Sign in before you start: a drawing doesn&apos;t carry over.
      </p>
      <GoogleSignIn next={next} size="sm" />
    </div>
  );
}
