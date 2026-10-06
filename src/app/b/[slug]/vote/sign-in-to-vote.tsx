"use client";

import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { PAPER } from "../board-look";
import { PinnedDrawing } from "../pinned-drawing";
import type { Tile } from "../tiles";
import { DrawingsHeading, DrawingsList } from "./drawings-list";

/**
 * Last week's drawings for someone not signed in (UI pass, 2026-10-03).
 * They look just like the voting ones, and tapping one to vote is the moment
 * to ask: a card comes up from the foot of the screen with the way in. The
 * header's corner has the same button for anyone who goes looking first.
 */
export function SignInToVote({
  tiles,
  next,
  heading = <DrawingsHeading />,
  notes,
  ask = "Sign in to vote. Three votes per week!",
}: {
  tiles: Tile[];
  /** Where to come back to after signing in. */
  next: string;
  /** Over the drawings; last week's by default. */
  heading?: React.ReactNode;
  /** A line under each drawing, by tile id (the monthly final's "won its week"). */
  notes?: Record<string, React.ReactNode>;
  /** What the card says after "Want to vote?". */
  ask?: string;
}) {
  const [asking, setAsking] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-4">
        {heading}
        <DrawingsList>
          {tiles.map((tile, index) => (
            <div key={tile.id} className="flex flex-col gap-2">
              <PinnedDrawing
                tile={tile}
                index={index}
                onPick={() => setAsking(true)}
              />
              {notes?.[tile.id]}
            </div>
          ))}
        </DrawingsList>
      </section>

      {asking && (
        <div
          role="dialog"
          aria-label="Sign in to vote"
          className={`motion-safe:animate-fade-up sticky bottom-4 z-20 flex items-center gap-3 rounded-xl p-3 pl-4 ${PAPER}`}
        >
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">
            <span className="text-foreground font-semibold">Want to vote?</span>{" "}
            {ask}
          </p>
          <GoogleSignIn
            next={next}
            label="Sign in"
            size="sm"
            withEmail={false}
          />
          <button
            type="button"
            aria-label="Not now"
            onClick={() => setAsking(false)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-highlight -mr-1 grid size-11 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3"
          >
            <XIcon weight="bold" className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
