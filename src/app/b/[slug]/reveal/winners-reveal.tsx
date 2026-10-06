"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { PodiumEntry, Reveal } from "./data";

/**
 * The reveal's motion. It plays once per device per result, so it can take
 * a few seconds: third place rises, then second, then first, then the crown
 * lands and confetti falls. Only transform and opacity move. Reduced motion
 * skips straight to the result.
 */
const REVEAL_CSS = `
@keyframes reveal-rise {
  from { opacity: 0; translate: 0 2.5rem; scale: 0.92; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}
@keyframes reveal-crown {
  0% { opacity: 0; translate: 0 -3rem; rotate: -20deg; scale: 1.6; }
  70% { opacity: 1; translate: 0 0.2rem; rotate: 6deg; scale: 0.95; }
  100% { opacity: 1; translate: 0 0; rotate: -8deg; scale: 1; }
}
@keyframes reveal-fall {
  from { opacity: 1; translate: 0 -2rem; rotate: 0deg; }
  to { opacity: 0; translate: var(--drift) 22rem; rotate: var(--spin); }
}
@keyframes reveal-fallback { to { opacity: 1; } }
.reveal[data-phase="pending"] .reveal-step { opacity: 0; animation: reveal-fallback 0s 2s forwards; }
.reveal[data-phase="play"] .reveal-step {
  animation: reveal-rise 650ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: var(--delay);
}
.reveal[data-phase="play"] .reveal-crown {
  animation: reveal-crown 700ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: var(--delay);
}
.reveal-confetti { display: none; }
.reveal[data-phase="play"] .reveal-confetti {
  display: block;
  animation: reveal-fall 2.4s cubic-bezier(0.25, 0.6, 0.4, 1) both;
  animation-delay: var(--delay);
}
@media (prefers-reduced-motion: reduce) {
  .reveal .reveal-step, .reveal .reveal-crown { animation: none !important; opacity: 1 !important; }
  .reveal .reveal-confetti { display: none !important; }
}
`;

/** When each place rises, in seconds: third first, the winner last. */
const RISE_AT: Record<number, number> = { 3: 0.3, 2: 1.1, 1: 1.9 };
const CROWN_AT = 2.7;

/** Podium blocks, tallest for first; laid out second, first, third. */
const BLOCK: Record<number, { height: string; color: string; order: string }> =
  {
    1: { height: "h-20", color: "bg-[#ffca39]", order: "order-2" },
    2: { height: "h-14", color: "bg-[#6badfa]", order: "order-1" },
    3: { height: "h-10", color: "bg-[#ff821b]", order: "order-3" },
  };

const CONFETTI_COLORS = ["#ffca39", "#6badfa", "#ff821b", "#004aad"];

/** Where each piece of confetti starts, drifts and spins; fixed, not random. */
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  drift: `${((index * 53) % 9) - 4}rem`,
  spin: `${((index * 97) % 720) - 360}deg`,
  delay: `${CROWN_AT + ((index * 13) % 10) / 20}s`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  shape: index % 3 === 0 ? "rounded-full size-2" : "h-3 w-1.5 rounded-sm",
}));

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

function Place({ entry }: { entry: PodiumEntry }) {
  const block = BLOCK[entry.place];
  const first = entry.place === 1;
  return (
    <li
      className={`reveal-step flex min-w-0 flex-1 flex-col items-center ${block.order}`}
      style={{ "--delay": `${RISE_AT[entry.place]}s` } as React.CSSProperties}
    >
      <div className={`relative w-full ${first ? "" : "mt-6"}`}>
        {first && (
          <span
            aria-hidden
            className="reveal-crown absolute -top-7 left-1/2 z-10 -translate-x-1/2 text-4xl"
            style={{ "--delay": `${CROWN_AT}s` } as React.CSSProperties}
          >
            👑
          </span>
        )}
        <Image
          src={entry.imageUrl}
          alt={
            entry.caption ?? `Drawing by ${entry.author ?? "a former member"}`
          }
          width={256}
          height={256}
          unoptimized
          // Loaded up front: the animation shouldn't rise on empty frames.
          loading="eager"
          className={`aspect-square w-full rounded-lg border-2 bg-white object-cover ${
            first ? "border-[#ffca39]" : "border-transparent"
          }`}
        />
      </div>
      <p className="mt-1 w-full truncate text-center text-xs font-semibold">
        {entry.author ?? "A former member"}
      </p>
      <p className="text-muted-foreground text-xs">
        {entry.votes} {entry.votes === 1 ? "vote" : "votes"}
      </p>
      <div
        className={`mt-1 flex w-full items-start justify-center rounded-t-md pt-1 text-lg font-black text-[#0f1b2d] ${block.height} ${block.color}`}
      >
        {entry.place}
      </div>
    </li>
  );
}

/**
 * A finished vote's podium on the board (docs/PLAN.md v12). The first time
 * a device opens the board after voting closes it plays the reveal; after
 * that it shows the result, with a button to play it again.
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
      aria-labelledby={`reveal-${reveal.id}`}
      className="reveal border-foreground relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border-2 bg-white px-4 pt-5 pb-0 shadow-[5px_5px_0_var(--primary)]"
      data-phase={phase}
      // A new key restarts the animation from the top.
      key={replays}
    >
      <style>{REVEAL_CSS}</style>
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          aria-hidden
          className={`reveal-confetti pointer-events-none absolute top-0 ${piece.shape}`}
          style={
            {
              left: piece.left,
              backgroundColor: piece.color,
              "--drift": piece.drift,
              "--spin": piece.spin,
              "--delay": piece.delay,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h2
            id={`reveal-${reveal.id}`}
            className="text-xl font-black tracking-tight"
          >
            {heading(reveal)}
          </h2>
          {/* Names the winner, so it waits for the crown like the rest. */}
          {winner && (
            <p
              className="reveal-step text-muted-foreground text-sm"
              style={{ "--delay": `${CROWN_AT}s` } as React.CSSProperties}
            >
              {winner.author ?? "A former member"} takes the crown
              {reveal.kind === "week" ? " and a spot in the Hall of Fame" : ""}.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReplays((count) => count + 1)}
        >
          Replay
        </Button>
      </div>

      <ol className="mt-6 flex items-end gap-2">
        {reveal.entries.map((entry) => (
          <Place key={entry.tileId} entry={entry} />
        ))}
      </ol>

      <Link
        href={hallOfFameHref}
        className="text-muted-foreground block py-3 text-center text-sm underline underline-offset-4"
      >
        See the Hall of Fame
      </Link>
    </section>
  );
}
