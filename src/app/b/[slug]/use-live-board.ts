"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { boardTopic, TILE_REMOVED_EVENT } from "@/lib/realtime/broadcast-topic";
import { getBrowserClient } from "@/lib/supabase/browser";
import { liveTileRowSchema, type Tile, TILES_BUCKET, toTile } from "./tiles";

type UseLiveBoardOptions = {
  venueId: string;
  /** The week currently shown, or `null` if the board has no posting week yet. */
  weekId: string | null;
  onTile: (tile: Tile) => void;
  onTileRemoved: (tileId: string) => void;
};

const removedPayloadSchema = z.object({ tileId: z.guid() });

/**
 * Keeps an open board current without a page refresh.
 *
 * - New tiles in the shown week are delivered to `onTile` as they're posted.
 * - A tile the owner removes is delivered to `onTileRemoved`. Removal arrives
 *   as a broadcast from the server rather than a database change, because a
 *   removed tile stops satisfying the "live tiles" policy, so Realtime won't
 *   send the update to visitors.
 * - A new week for the venue (created by the first post of the week) refreshes
 *   the page so the board switches to it.
 * - Whenever the Realtime subscription (re)connects, and whenever the tab
 *   becomes visible again, the page is refreshed to pick up anything posted
 *   while the connection was down — phones drop it as soon as they sleep.
 */
export function useLiveBoard({
  venueId,
  weekId,
  onTile,
  onTileRemoved,
}: UseLiveBoardOptions) {
  const router = useRouter();
  const onTileRef = useRef(onTile);
  const onTileRemovedRef = useRef(onTileRemoved);

  useEffect(() => {
    onTileRef.current = onTile;
    onTileRemovedRef.current = onTileRemoved;
  }, [onTile, onTileRemoved]);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserClient>;
    try {
      supabase = getBrowserClient();
    } catch (error) {
      // The board still works without live updates; it just needs a refresh.
      console.error("Live board updates are unavailable", error);
      return;
    }

    const storage = supabase.storage.from(TILES_BUCKET);
    // `wait` holds SUBSCRIBED until the database change feed is actually
    // live, so the refresh below can't run before the gap it covers closes.
    const channel = supabase.channel(boardTopic(venueId), {
      config: { postgres_changes_options: { wait: true } },
    });

    channel.on("broadcast", { event: TILE_REMOVED_EVENT }, (message) => {
      const payload = removedPayloadSchema.safeParse(message.payload);
      if (payload.success) onTileRemovedRef.current(payload.data.tileId);
    });

    if (weekId) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tiles",
          filter: `week_id=eq.${weekId}`,
        },
        (payload) => {
          const row = liveTileRowSchema.safeParse(payload.new);
          if (!row.success) return;
          onTileRef.current(
            toTile(
              row.data,
              (path) => storage.getPublicUrl(path).data.publicUrl,
            ),
          );
        },
      );
    }

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "weeks",
        filter: `venue_id=eq.${venueId}`,
      },
      () => router.refresh(),
    );

    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") {
        // Covers tiles posted between the server render and this subscription,
        // or while a dropped connection was reconnecting.
        router.refresh();
      } else if (status === "CHANNEL_ERROR") {
        // Usually a dropped connection (e.g. a phone sleeping). The client
        // retries on its own and the SUBSCRIBED refresh above catches up.
        console.warn("Live board connection interrupted; reconnecting", error);
      }
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [venueId, weekId, router]);
}
