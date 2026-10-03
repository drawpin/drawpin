"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { INKED_BUTTON, YELLOW_STRIP } from "../board-look";
import { CornerLabel, PinnedDrawing } from "../pinned-drawing";
import type { Tile } from "../tiles";
import { castVotesAction } from "./actions";
import { DrawingsHeading, DrawingsList } from "./drawings-list";
import type { VoteState } from "./schema";
import { TileWall } from "./tile-wall";

const initialState: VoteState = { status: "idle" };

/** Why a tile can't be picked, or `null` when it can. */
function notVotableBecause(
  tile: Tile,
  alreadyVoted: ReadonlySet<string>,
): string | null {
  if (alreadyVoted.has(tile.id)) return "Voted";
  if (tile.isOwn) return "Yours";
  if (tile.isGuest) return "Guest";
  return null;
}

/**
 * Last week's board, with up to three picks cast in one go
 * (docs/PLAN.md, Weekly cycle).
 *
 * Guest tiles and your own are shown but can't be picked — the board is
 * everyone's, the competition is between accounts.
 *
 * In the board's look (UI pass, 2026-10-03): the drawings are pinned
 * polaroids, a tap picks one (it lifts, straightens and gets a yellow
 * check), and the Cast button stays in reach at the foot of the screen.
 */
export function VoteGrid({
  slug,
  tiles,
  votesLeft,
  votedTileIds,
  turnstileSiteKey,
}: {
  slug: string;
  tiles: Tile[];
  votesLeft: number;
  /** Tiles this account has already voted for, which it can't pick again. */
  votedTileIds: string[];
  turnstileSiteKey: string;
}) {
  const [state, formAction, pending] = useActionState(
    castVotesAction,
    initialState,
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [castState, setCastState] = useState<VoteState | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Votes are final, so once they're cast the picks that made them have to
  // go: leaving them selected invites a second press that can only fail.
  if (state !== castState && state.status === "cast") {
    setCastState(state);
    setPicked(new Set());
  }

  const alreadyVoted = new Set([
    ...votedTileIds,
    ...(state.status === "cast" ? picked : []),
  ]);

  // The action's own count wins once it has run: the page behind it is stale
  // until it revalidates.
  const left = state.status === "cast" ? state.votesLeft : votesLeft;

  function toggle(tileId: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(tileId)) next.delete(tileId);
      else if (next.size < left) next.add(tileId);
      return next;
    });
  }

  if (left === 0) {
    // Out of votes, but the board is still worth looking at.
    return (
      <>
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          {state.status === "cast"
            ? "Votes cast. That's all three for this week, and they're final."
            : "You've used all three of your votes this week."}
        </p>
        <TileWall tiles={tiles} />
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      {[...picked].map((tileId) => (
        <input key={tileId} type="hidden" name="tileIds" value={tileId} />
      ))}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />

      <p role="status" className="text-muted-foreground text-sm font-semibold">
        {state.status === "cast" && "Votes cast. "}
        Tap a drawing to pick it. {left} {left === 1 ? "vote" : "votes"} left
        this week, and votes are final.
      </p>

      <section className="flex flex-col gap-4">
        <DrawingsHeading />
        <DrawingsList>
          {tiles.map((tile, index) => {
            const blocked = notVotableBecause(tile, alreadyVoted);
            const isPicked = picked.has(tile.id);
            return (
              <PinnedDrawing
                key={tile.id}
                tile={tile}
                index={index}
                picked={isPicked}
                disabled={blocked !== null || pending}
                dim={blocked === "Yours" || blocked === "Guest"}
                onPick={() => toggle(tile.id)}
                badge={
                  blocked === "Voted" ? (
                    <CornerLabel tone="voted">Voted</CornerLabel>
                  ) : blocked ? (
                    <CornerLabel>{blocked}</CornerLabel>
                  ) : isPicked ? (
                    <span
                      aria-hidden
                      className="vote-check border-foreground bg-winner text-foreground absolute -right-3 -bottom-3 grid size-10 place-items-center rounded-full border-2"
                    >
                      <CheckIcon weight="bold" className="size-5" />
                    </span>
                  ) : null
                }
              />
            );
          })}
        </DrawingsList>
      </section>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} />

      {/* Stays in reach while scrolling through the drawings. */}
      <div className="sticky bottom-4 z-20">
        <button
          type="submit"
          disabled={pending || picked.size === 0 || !token}
          className={`${INKED_BUTTON} h-14 w-full text-lg`}
        >
          {pending
            ? "Casting…"
            : !token
              ? "Checking your browser…"
              : picked.size === 0
                ? "Pick a drawing"
                : `Cast ${picked.size} ${picked.size === 1 ? "vote" : "votes"}`}
        </button>
      </div>
    </form>
  );
}
