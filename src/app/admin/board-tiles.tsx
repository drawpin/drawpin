"use client";

import { OwnerTileGrid } from "./owner-tiles";

export type AdminTile = {
  id: string;
  author: string | null;
  /** Posted by an account, which the owner can block (ADR-008). */
  canBlock: boolean;
  caption: string | null;
  imageUrl: string;
};

/** This week's drawings, for the owner to remove or block. */
export function BoardTiles({ tiles }: { tiles: AdminTile[] }) {
  if (tiles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No drawings on the board this week.
      </p>
    );
  }

  return (
    <OwnerTileGrid
      tiles={tiles}
      countLabel={`${tiles.length} ${tiles.length === 1 ? "drawing" : "drawings"}`}
      details={(tile) => (
        <>
          {tile.caption && (
            <p className="text-sm break-words">{tile.caption}</p>
          )}
          <p className="text-muted-foreground text-xs">
            {tile.author ?? "Guest"}
          </p>
        </>
      )}
    />
  );
}
