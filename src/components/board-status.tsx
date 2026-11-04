"use client";

import { useSyncExternalStore } from "react";
import {
  type BoardStatus,
  lastVisitLabel,
  statusWords,
} from "@/lib/board-status";
import { hasSeenReveal } from "@/lib/reveal-seen";

/** Each status's fill (docs/design/profiles.md, section 1). */
const DOT_FILL: Record<Exclude<BoardStatus, null>, string> = {
  draw: "bg-winner",
  vote: "bg-primary",
  final: "bg-attention",
  results: "bg-highlight",
};

/**
 * A status's coloured dot, ink-outlined. Decorative: the words beside it
 * carry the meaning, never the colour alone.
 */
export function StatusDot({ status }: { status: Exclude<BoardStatus, null> }) {
  return (
    <span
      aria-hidden
      className={`border-foreground size-2.5 shrink-0 rounded-full border-2 ${DOT_FILL[status]}`}
    />
  );
}

const noSubscription = () => () => {};

/**
 * Whether any of these results is still news on this device. The server
 * can't know what this browser has watched, so it says "yes" and the client
 * corrects it after hydration.
 */
function useUnseenResults(revealIds: string[]): boolean {
  const key = revealIds.join(",");
  return useSyncExternalStore(
    noSubscription,
    () => key !== "" && key.split(",").some((id) => !hasSeenReveal(id)),
    () => key !== "",
  );
}

/**
 * What's waiting on a board, as a dot and words ("Draw today", "2 votes
 * left"), or when it was last opened if nothing is.
 */
export function StatusLine({
  status,
  votesLeft,
  revealIds = [],
  lastVisitedAt,
}: {
  status: BoardStatus;
  votesLeft?: number;
  /** For "results": the reveals that might still be unseen here. */
  revealIds?: string[];
  lastVisitedAt: string;
}) {
  const unseen = useUnseenResults(status === "results" ? revealIds : []);
  const shown = status === "results" && !unseen ? null : status;
  const words = statusWords({ status: shown, votesLeft });

  if (!shown || !words) {
    return (
      // The label counts days from now, which can differ by a second
      // between the server and the browser.
      <span
        suppressHydrationWarning
        className="text-muted-foreground block truncate text-xs"
      >
        {lastVisitLabel(lastVisitedAt, new Date())}
      </span>
    );
  }
  return (
    <span className="text-foreground flex min-w-0 items-center gap-1.5 text-xs font-semibold">
      <StatusDot status={shown} />
      <span className="truncate">{words}</span>
    </span>
  );
}

/** The small "Owner" chip on a board you run. */
export function OwnerChip() {
  return (
    <span className="border-foreground bg-secondary shrink-0 rounded-md border-2 px-1.5 text-[11px] leading-4 font-bold">
      Owner
    </span>
  );
}
