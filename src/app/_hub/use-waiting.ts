"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TodayCard } from "@/lib/home-hub";
import { hasSeenReveal } from "@/lib/reveal-seen";

const noSubscription = () => () => {};

/**
 * The Today cards still waiting on this device. A "Results are in" card goes
 * once its board's reveal has been watched here, which only the browser
 * knows: the server counts every result as news, and the client corrects
 * it after hydration, the way `StatusLine` does.
 */
export function useWaitingCards(cards: TodayCard[]): TodayCard[] {
  const results = cards.filter((card) => card.kind === "results");
  // A string snapshot, so the store compares by value between renders.
  const unseen = useSyncExternalStore(
    noSubscription,
    () =>
      results
        .filter((card) => card.revealIds.some((id) => !hasSeenReveal(id)))
        .map((card) => card.venueId)
        .join(","),
    () => results.map((card) => card.venueId).join(","),
  );
  return useMemo(() => {
    const shown = new Set(unseen.split(","));
    return cards.filter(
      (card) => card.kind !== "results" || shown.has(card.venueId),
    );
  }, [cards, unseen]);
}
