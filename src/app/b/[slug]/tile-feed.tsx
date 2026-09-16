"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadMoreTiles } from "./actions";
import type { Tile, TileCursor } from "./tiles";

const ABOVE_THE_FOLD_TILES = 4;

type TileFeedProps = {
  weekId: string;
  initialTiles: Tile[];
  initialCursor: TileCursor | null;
};

export function TileFeed({
  weekId,
  initialTiles,
  initialCursor,
}: TileFeedProps) {
  const [tiles, setTiles] = useState(initialTiles);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setError(null);

    startTransition(async () => {
      const result = await loadMoreTiles({ weekId, cursor });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setTiles((current) => {
        // Guard against duplicates if the feed also gains live updates later.
        const seen = new Set(current.map((tile) => tile.id));
        return [
          ...current,
          ...result.tiles.filter((tile) => !seen.has(tile.id)),
        ];
      });
      setCursor(result.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-3">
        {tiles.map((tile, index) => (
          <li key={tile.id} className="flex flex-col gap-1">
            <Image
              src={tile.imageUrl}
              // The first rows are on screen at load; lazy-loading them delays
              // the largest paint.
              loading={index < ABOVE_THE_FOLD_TILES ? "eager" : "lazy"}
              alt={
                tile.caption ??
                (tile.author
                  ? `Drawing by ${tile.author}`
                  : "Anonymous drawing")
              }
              width={512}
              height={512}
              // Tiles are already small WebP files served from the storage CDN.
              unoptimized
              className="aspect-square w-full rounded-lg border bg-white object-cover"
            />
            {tile.caption && (
              <p className="text-sm break-words">{tile.caption}</p>
            )}
            <p className="text-muted-foreground text-xs">
              {tile.author ?? "Anonymous"}
            </p>
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
