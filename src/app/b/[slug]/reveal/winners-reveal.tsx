"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { type Leader, Podium } from "../vote/podium";
import type { PodiumEntry, Reveal } from "./data";

/** Who a winner was when their account is gone. */
const FORMER_MEMBER = "A former member";

/**
 * When the winner is named: once the podium has finished, so the line
 * doesn't give the result away (the top step's scribble ends about here).
 */
const NAME_AFTER_MS = 1800;

/** Whether this device has seen a result. Storage can be unavailable. */
function seen(id: string): boolean {
  try {
    return localStorage.getItem(`drawpin:reveal:${id}`) === "1";
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(`drawpin:reveal:${id}`, "1");
  } catch {
    // Without storage it simply plays again next visit.
  }
}

/**
 * What a result does on its first render in this browser: play if it's new
 * here, otherwise show the outcome. Read once and kept, so marking it seen
 * doesn't stop it part-way through.
 */
const firstLook = new Map<string, "play" | "done">();

function phaseOnArrival(id: string): "play" | "done" {
  if (!firstLook.has(id)) firstLook.set(id, seen(id) ? "done" : "play");
  return firstLook.get(id)!;
}

const noSubscription = () => () => {};

function heading(reveal: Reveal): string {
  if (reveal.kind === "week") return "Last week's winners";
  const month = new Date(`${reveal.month}T12:00:00Z`).toLocaleDateString(
    "en-GB",
    { month: "long", timeZone: "UTC" },
  );
  return `${month}'s super winner`;
}

/** The podium's places; a result only ever has the top 3. */
function toLeaders(entries: PodiumEntry[]): Leader[] {
  return entries.flatMap((entry): Leader[] =>
    entry.place === 1 || entry.place === 2 || entry.place === 3
      ? [
          {
            place: entry.place,
            votes: entry.votes,
            tile: {
              id: entry.tileId,
              // A finished result's missing author left; it isn't a guest.
              author: entry.author ?? FORMER_MEMBER,
              caption: entry.caption,
              imageUrl: entry.imageUrl,
            },
          },
        ]
      : [],
  );
}

/**
 * A finished vote's podium on the board (docs/PLAN.md v12), the same inked
 * podium as the vote page's. The first time a device opens the board after
 * voting closes it plays: the steps rise, are scribbled in and the drawings
 * are pinned on, then the winner is named. After that it shows the result
 * still, with a button to play it again.
 */
export function WinnersReveal({
  reveal,
  hallOfFameHref,
}: {
  reveal: Reveal;
  hallOfFameHref: string;
}) {
  // "pending" on the server, which can't know what this browser has seen.
  const arrival = useSyncExternalStore(
    noSubscription,
    () => phaseOnArrival(reveal.id),
    () => "pending" as const,
  );
  const [replays, setReplays] = useState(0);
  const phase = replays > 0 ? "play" : arrival;

  useEffect(() => {
    if (arrival === "play") markSeen(reveal.id);
  }, [arrival, reveal.id]);

  const winner = reveal.entries.find((entry) => entry.place === 1);

  return (
    <section
      aria-label={heading(reveal)}
      className="reveal border-foreground mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-xl border-2 bg-white p-4 shadow-[5px_5px_0_var(--primary)] sm:p-5"
      data-phase={phase}
    >
      {/* A new key starts every entrance again from the top. */}
      <div key={`${phase}:${replays}`} className="reveal-stage">
        <Podium
          heading={heading(reveal)}
          leaders={toLeaders(reveal.entries)}
          settled
        />
        {winner && (
          <p
            className={`mt-4 font-semibold ${phase === "play" ? "motion-safe:animate-fade-up" : ""}`}
            style={
              phase === "play"
                ? { animationDelay: `${NAME_AFTER_MS}ms` }
                : undefined
            }
          >
            {winner.author ?? FORMER_MEMBER} takes the crown
            {reveal.kind === "week" ? " and a spot in the Hall of Fame" : ""}.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={hallOfFameHref}
          className="text-primary inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
        >
          See the Hall of Fame
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setReplays((count) => count + 1)}
        >
          Replay
        </Button>
      </div>
    </section>
  );
}
