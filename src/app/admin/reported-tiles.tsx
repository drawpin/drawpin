"use client";

import type { AdminTile } from "./board-tiles";
import { OwnerTileGrid } from "./owner-tiles";

export type ReportedAdminTile = AdminTile & {
  reportCount: number;
  reasons: string[];
};

const REASON_LABELS: Record<string, string> = {
  offensive: "hateful or offensive",
  sexual: "sexual",
  violent: "violent",
  spam: "spam",
  other: "something else",
};

/**
 * The queue of tiles customers have flagged, most reported first, as small
 * tiles with the same options as this week's drawings plus Keep it, which
 * decides a drawing is fine and clears its reports.
 */
export function ReportedTiles({ tiles }: { tiles: ReportedAdminTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-black tracking-tight">Reported drawings</h2>
      <p className="text-muted-foreground text-sm">
        Nothing is hidden automatically. Take a look and decide.
      </p>
      <OwnerTileGrid
        tiles={tiles}
        countLabel={`${tiles.length} reported`}
        canKeep
        details={(tile) => (
          <>
            {/* The caption may be what was reported, so it always shows. */}
            {tile.caption && (
              <p className="text-sm break-words">{tile.caption}</p>
            )}
            <p className="text-muted-foreground text-xs break-words">
              {tile.author ?? "Guest"} · {tile.reportCount}{" "}
              {tile.reportCount === 1 ? "report" : "reports"}:{" "}
              {tile.reasons
                .map((reason) => REASON_LABELS[reason] ?? reason)
                .join(", ")}
            </p>
          </>
        )}
      />
    </section>
  );
}
