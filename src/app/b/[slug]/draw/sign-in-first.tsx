import { GoogleSignIn } from "@/components/google-sign-in";

/**
 * The last moment at which signing in is still worth anything.
 *
 * A guest tile goes up on the board but can't be voted for or win, and
 * posting claims the device's one drawing for the day either way
 * (`post-tile.ts`). So a guest who draws first has spent their day on a tile
 * nobody can vote for, and signing in afterwards doesn't give it back.
 *
 * The board's `AccountBar` makes the same offer, but it sits under the tile
 * feed — which nobody scrolls to after tapping "Draw a tile" at the top of
 * the page. This one is in front of the canvas, before anything is spent.
 *
 * It never blocks: drawing needs no account (docs/PLAN.md, Accounts).
 */
export function SignInFirst({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
      <p className="text-sm font-medium">Sign in before you draw</p>
      <p className="text-muted-foreground text-xs">
        You get one drawing a day. Drawn as a guest it still goes up on the
        board, but nobody can vote for it — and signing in afterwards won&apos;t
        change that.
      </p>
      <GoogleSignIn next={next} size="sm" />
    </div>
  );
}
