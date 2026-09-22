"use client";

import Image from "next/image";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadMoreTiles } from "./actions";
import { ReportTile } from "./report-tile";
import { mergeTiles, type Tile, type TileCursor } from "./tiles";
import { useLiveBoard } from "./use-live-board";

const ABOVE_THE_FOLD_TILES = 4;

type TileFeedProps = {
  venueId: string;
  /** Only signed-in customers can report a drawing (docs/PLAN.md). */
  canReport: boolean;
  /** `null` until the board's first post of the week creates the week. */
  weekId: string | null;
  /** When this week stops taking posts, so the board can roll itself over. */
  postingEndsAt: string | null;
  initialTiles: Tile[];
  initialCursor: TileCursor | null;
};

/**
 * The board's tile feed: the server's first page, older pages loaded on
 * demand, and new tiles arriving live. Remount it (via `key`) when the week
 * changes, since tiles and the cursor belong to one week.
 */
export function TileFeed({
  venueId,
  weekId,
  postingEndsAt,
  canReport,
  initialTiles,
  initialCursor,
}: TileFeedProps) {
  const [tiles, setTiles] = useState(initialTiles);
  const [renderedInitialTiles, setRenderedInitialTiles] =
    useState(initialTiles);
  // Not updated from props: a refreshed first page shifts, but everything
  // above the original cursor stays on screen (see mergeTiles), so the cursor
  // still points at the right next page.
  const [cursor, setCursor] = useState(initialCursor);
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A router refresh hands over a newer first page. Merge it into what's on
  // screen instead of replacing it, so tiles that slid off the server's first
  // page don't vanish.
  if (initialTiles !== renderedInitialTiles) {
    setRenderedInitialTiles(initialTiles);
    setTiles((current) => mergeTiles(initialTiles, current));
  }

  const addLiveTile = useCallback((tile: Tile) => {
    setTiles((current) => mergeTiles([tile], current));
  }, []);

  const dropRemovedTile = useCallback((tileId: string) => {
    setRemovedIds((current) =>
      current.has(tileId) ? current : new Set(current).add(tileId),
    );
  }, []);

  useLiveBoard({
    venueId,
    weekId,
    postingEndsAt,
    onTile: addLiveTile,
    onTileRemoved: dropRemovedTile,
  });

  // Kept separately from `tiles`: a refresh can hand back a page that still
  // contains a tile removed moments ago, and it must stay hidden.
  const visibleTiles = tiles.filter((tile) => !removedIds.has(tile.id));

  function loadMore() {
    if (!cursor || !weekId) return;
    setError(null);

    startTransition(async () => {
      const result = await loadMoreTiles({ weekId, cursor });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setTiles((current) => mergeTiles(current, result.tiles));
      setCursor(result.nextCursor);
    });
  }

  if (visibleTiles.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Nobody has drawn anything this week. Be the first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-3">
        {/* The list items stretch across their column on purpose: the caption
            and the name need that width to clip against, and the Report button
            sets its own. */}
        {visibleTiles.map((tile, index) => (
          <li key={tile.id} className="flex flex-col gap-1">
            <Image
              src={tile.imageUrl}
              // The first rows are on screen at load; lazy-loading them delays
              // the largest paint.
              loading={index < ABOVE_THE_FOLD_TILES ? "eager" : "lazy"}
              alt={
                tile.caption ??
                (tile.author ? `Drawing by ${tile.author}` : "Guest drawing")
              }
              width={512}
              height={512}
              // Tiles are already small WebP files served from the storage CDN.
              unoptimized
              className="aspect-square w-full rounded-lg border bg-white object-cover"
            />
            {/* Clamped so one chatty caption doesn't push its neighbour's
                drawing halfway down the screen. */}
            {tile.caption && (
              <p className="line-clamp-2 text-sm break-words">{tile.caption}</p>
            )}
            <p className="text-muted-foreground truncate text-xs">
              {tile.author ?? "Guest"}
              {tile.isGuest && tile.author && " · guest"}
            </p>
            {canReport && !tile.isOwn && <ReportTile tileId={tile.id} />}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}

      {cursor && (
        <Button
          variant="outline"
          size="lg"
          onClick={loadMore}
          disabled={pending}
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
