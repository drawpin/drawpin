"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import type { Tile } from "../tiles";
import { castVotesAction } from "./actions";
import type { VoteState } from "./schema";
import { TileWall } from "./tile-wall";

const initialState: VoteState = { status: "idle" };

const ABOVE_THE_FOLD_TILES = 4;

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
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          {state.status === "cast"
            ? "Votes cast. That's all three for this week — they're final."
            : "You've used all three of your votes this week."}
        </p>
        <TileWall tiles={tiles} />
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      {[...picked].map((tileId) => (
        <input key={tileId} type="hidden" name="tileIds" value={tileId} />
      ))}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />

      <p role="status" className="text-sm">
        {state.status === "cast" && "Votes cast. "}
        {left} {left === 1 ? "vote" : "votes"} left this week. Votes are final.
      </p>

      <ul className="grid grid-cols-2 gap-3">
        {tiles.map((tile, index) => {
          const blocked = notVotableBecause(tile, alreadyVoted);
          const isPicked = picked.has(tile.id);

          return (
            <li key={tile.id}>
              <button
                type="button"
                onClick={() => toggle(tile.id)}
                disabled={blocked !== null || pending}
                aria-pressed={isPicked}
                className={`flex h-full w-full flex-col gap-1 rounded-lg border p-1 text-left ${
                  isPicked ? "border-primary border-2" : ""
                } ${blocked ? "opacity-60" : ""}`}
              >
                <Image
                  src={tile.imageUrl}
                  loading={index < ABOVE_THE_FOLD_TILES ? "eager" : "lazy"}
                  alt={tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`}
                  width={512}
                  height={512}
                  unoptimized
                  className="aspect-square w-full rounded bg-white object-cover"
                />
                {tile.caption && (
                  <span className="line-clamp-2 text-sm break-words">
                    {tile.caption}
                  </span>
                )}
                <span className="text-muted-foreground truncate text-xs">
                  {tile.author ?? "Guest"}
                  {blocked && ` · ${blocked}`}
                  {isPicked && " · picked"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} />

      <Button
        type="submit"
        size="lg"
        disabled={pending || picked.size === 0 || !token}
      >
        {pending
          ? "Casting…"
          : !token
            ? "Checking your browser…"
            : picked.size === 0
              ? "Pick a drawing"
              : `Cast ${picked.size} ${picked.size === 1 ? "vote" : "votes"}`}
      </Button>
    </form>
  );
}
