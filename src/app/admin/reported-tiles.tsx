"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  dismissReportsAction,
  removeTileAction,
  type RemoveTileState,
} from "./actions";
import type { AdminTile } from "./board-tiles";

export type ReportedAdminTile = AdminTile & {
  reportCount: number;
  reasons: string[];
};

const initialState: RemoveTileState = { status: "idle" };

const REASON_LABELS: Record<string, string> = {
  offensive: "hateful or offensive",
  sexual: "sexual",
  violent: "violent",
  spam: "spam",
  other: "something else",
};

/**
 * A reported tile, with the two things the owner can do about it: take it
 * down, or decide it's fine and clear the report.
 */
function ReportedCard({ tile }: { tile: ReportedAdminTile }) {
  const [removeState, remove, removing] = useActionState(
    removeTileAction,
    initialState,
  );
  const [dismissState, dismiss, dismissing] = useActionState(
    dismissReportsAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const error =
    removeState.status === "error"
      ? removeState.message
      : dismissState.status === "error"
        ? dismissState.message
        : null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-2">
      <Image
        src={tile.imageUrl}
        alt={tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`}
        width={512}
        height={512}
        unoptimized
        className="aspect-square w-full rounded bg-white object-cover"
      />
      {tile.caption && <p className="text-sm break-words">{tile.caption}</p>}
      <p className="text-muted-foreground text-xs">
        {tile.author ?? "Guest"} · {tile.reportCount}{" "}
        {tile.reportCount === 1 ? "report" : "reports"}:{" "}
        {tile.reasons
          .map((reason) => REASON_LABELS[reason] ?? reason)
          .join(", ")}
      </p>

      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <form action={remove} className="flex gap-2">
            <input type="hidden" name="tileId" value={tile.id} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={removing}
            >
              {removing ? "Removing…" : "Confirm removal"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Remove
            </Button>
            <form action={dismiss}>
              <input type="hidden" name="tileId" value={tile.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={dismissing}
              >
                {dismissing ? "Dismissing…" : "It's fine"}
              </Button>
            </form>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </li>
  );
}

/** The queue of tiles customers have flagged, most reported first. */
export function ReportedTiles({ tiles }: { tiles: ReportedAdminTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">
        Reported by customers ({tiles.length})
      </h2>
      <p className="text-muted-foreground text-xs">
        Nothing is hidden automatically. Take a look and decide.
      </p>
      <ul className="flex flex-col gap-4">
        {tiles.map((tile) => (
          <ReportedCard key={tile.id} tile={tile} />
        ))}
      </ul>
    </section>
  );
}
