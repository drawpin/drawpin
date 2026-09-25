"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import {
  type BoardStats,
  type BoardStatsRow,
  boardStatsSummary,
  toBoardStats,
} from "./stats";

/**
 * The board's participation at a glance: how many people have drawn, how many
 * drawings there are, and how many landed this week. Shown to everyone — the
 * social proof that makes an open board feel worth joining.
 *
 * Starts from the server's numbers, then keeps up by itself: each new drawing
 * in the shown week asks the database for fresh totals. A new drawing can't
 * simply add one, because "artists" only grows when the person is new, and
 * only the database can tell — device ids never reach the browser. So it
 * re-reads all three through `board_stats` instead.
 *
 * Removals don't arrive live (a removed tile is invisible to visitors, so no
 * change reaches them); the page refreshes itself whenever the tab comes back
 * into view, which brings the numbers back in line.
 */
export function BoardStatsLine({
  venueId,
  weekId,
  initialStats,
}: {
  venueId: string;
  /** The week the board is showing, or `null` before its first drawing. */
  weekId: string | null;
  initialStats: BoardStats;
}) {
  const [stats, setStats] = useState(initialStats);
  // A server render — the page refreshes on reconnect and at the weekly
  // rollover — brings numbers newer than the ones held here.
  const [serverStats, setServerStats] = useState(initialStats);
  if (initialStats !== serverStats) {
    setServerStats(initialStats);
    setStats(initialStats);
  }

  useEffect(() => {
    // No week yet means no drawings to wait for. The first one creates the
    // week, and the page refreshes into it with a week to listen to.
    if (!weekId) return;

    let supabase: ReturnType<typeof getBrowserClient>;
    try {
      supabase = getBrowserClient();
    } catch {
      // The numbers still show; they just wait for a refresh to change.
      return;
    }

    let active = true;
    async function refresh() {
      const { data, error } = await supabase
        .rpc("board_stats", { p_venue_id: venueId })
        .single<BoardStatsRow>();
      if (active && !error && data) setStats(toBoardStats(data));
    }

    const channel = supabase
      .channel(`board-stats:${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tiles",
          filter: `week_id=eq.${weekId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [venueId, weekId]);

  const summary = boardStatsSummary(stats);
  if (!summary) return null;

  return <p className="text-muted-foreground text-sm">{summary}</p>;
}
