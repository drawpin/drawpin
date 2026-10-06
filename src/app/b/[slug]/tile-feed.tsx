"use client";

import Image from "next/image";
import { useCallback, useState, useTransition } from "react";
import { type PinColor, pinColorFor, pinStyle } from "@/components/pin";
import { Button } from "@/components/ui/button";
import { loadMoreTiles } from "./actions";
import { PAPER, YELLOW_STRIP } from "./board-look";
import { DrawingCloseUp } from "./drawing-close-up";
import { ReportTile } from "./report-tile";
import { describeTile, TileCaption } from "./tile-caption";
import { mergeTiles, type Tile, type TileCursor, tiltFor } from "./tiles";
import { useLiveBoard } from "./use-live-board";

const ABOVE_THE_FOLD_TILES = 4;

/** Drawings whose pins go in one after another when the board loads; the rest go in together. */
const STAGGERED_TILES = 8;
const STAGGER_MS = 60;

/** A drawing open up close, and where it hangs on the board. */
type CloseUp = {
  tile: Tile;
  source: HTMLElement;
  lean: number;
  pinColor: PinColor;
};

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
 *
 * Each drawing is pinned up on paper with its name and caption (UI pass,
 * 2026-10-02). It swings into place on its pin as it scrolls in, lifts on
 * its pin under a mouse, and a tap takes it down to see it up close.
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
  // Tiles that arrived live rather than with the page: they drop in.
  const [liveIds, setLiveIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [closeUp, setCloseUp] = useState<CloseUp | null>(null);

  // A router refresh hands over a newer first page. Merge it into what's on
  // screen instead of replacing it, so tiles that slid off the server's first
  // page don't vanish.
  if (initialTiles !== renderedInitialTiles) {
    setRenderedInitialTiles(initialTiles);
    setTiles((current) => mergeTiles(initialTiles, current));
  }

  const addLiveTile = useCallback((tile: Tile) => {
    setTiles((current) => mergeTiles([tile], current));
    setLiveIds((current) => new Set(current).add(tile.id));
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
      <p
        className={`text-muted-foreground -rotate-1 px-4 py-10 text-center ${PAPER}`}
      >
        Nobody has drawn anything this week. Be the first.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {/* A strip of yellow paper for a heading. Only drawings are pinned. */}
      <h2 className={`${YELLOW_STRIP} text-3xl`}>Pinned up this week</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
        {visibleTiles.map((tile, index) => {
          const lean = tiltFor(tile.id);
          const pinColor = pinColorFor(tile.id);
          const live = liveIds.has(tile.id);
          return (
            <li
              key={tile.id}
              // A drawing that arrived live drops in; the rest swing into
              // place on their pins as they scroll into view, alternating
              // sides like papers in a draught.
              className={`min-w-0 ${live ? "motion-safe:animate-drop-in" : "board-sway"}`}
              style={
                live
                  ? undefined
                  : ({
                      "--swing": `${index % 2 ? 7 : -7}deg`,
                    } as React.CSSProperties)
              }
            >
              <div
                className={`tile-frame pinned pin-pop relative flex origin-top flex-col gap-2 p-1.5 pb-2 ${PAPER}`}
                style={
                  {
                    ...pinStyle(
                      pinColor,
                      index < STAGGERED_TILES ? 150 + index * STAGGER_MS : 0,
                    ),
                    // Leaning a touch, like a drawing pinned up by hand;
                    // hovered, it swings the other way.
                    transform: `rotate(${lean}deg)`,
                    "--hover-swing": `${lean > 0 ? -3.5 : 3.5}deg`,
                    // Taken down while it's open up close.
                    visibility:
                      closeUp?.tile.id === tile.id ? "hidden" : undefined,
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  aria-label={`Open ${describeTile(tile)} up close`}
                  onClick={(event) => {
                    const paper = event.currentTarget.parentElement;
                    if (paper)
                      setCloseUp({ tile, source: paper, lean, pinColor });
                  }}
                  className="focus-visible:ring-highlight block cursor-zoom-in outline-none focus-visible:ring-3"
                >
                  <Image
                    src={tile.imageUrl}
                    // The first rows are on screen at load; lazy-loading them
                    // delays the largest paint.
                    loading={index < ABOVE_THE_FOLD_TILES ? "eager" : "lazy"}
                    alt={describeTile(tile)}
                    width={512}
                    height={512}
                    // Tiles are already small WebP files served from the
                    // storage CDN.
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                </button>
                <div className="flex flex-wrap items-start justify-between gap-x-1 px-1">
                  <span className="min-w-0 flex-1">
                    <TileCaption tile={tile} />
                  </span>
                  {canReport && !tile.isOwn && <ReportTile tileId={tile.id} />}
                </div>
              </div>
            </li>
          );
        })}
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

      {closeUp && (
        <DrawingCloseUp
          tile={closeUp.tile}
          source={closeUp.source}
          lean={closeUp.lean}
          pinColor={closeUp.pinColor}
          onClosed={() => setCloseUp(null)}
        />
      )}
    </section>
  );
}
