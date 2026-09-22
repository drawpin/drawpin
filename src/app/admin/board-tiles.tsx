"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeTileAction, type RemoveTileState } from "./actions";

export type AdminTile = {
  id: string;
  author: string | null;
  caption: string | null;
  imageUrl: string;
};

const initialState: RemoveTileState = { status: "idle" };

/**
 * A tile with a two-step Remove button. Removing is permanent — the image file
 * is deleted — so the first tap only asks for confirmation.
 */
function TileCard({ tile }: { tile: AdminTile }) {
  const [state, formAction, pending] = useActionState(
    removeTileAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex h-full flex-col gap-1">
      <Image
        src={tile.imageUrl}
        alt={tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`}
        width={512}
        height={512}
        unoptimized
        className="aspect-square w-full rounded-lg border bg-white object-cover"
      />
      {tile.caption && <p className="text-sm break-words">{tile.caption}</p>}
      <p className="text-muted-foreground text-xs">{tile.author ?? "Guest"}</p>

      {/* Pushed to the bottom so the buttons in a row line up however long
          the captions above them are. */}
      {confirming ? (
        <form action={formAction} className="mt-auto flex gap-2">
          <input type="hidden" name="tileId" value={tile.id} />
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={pending}
          >
            {pending ? "Removing…" : "Confirm"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-auto"
          onClick={() => setConfirming(true)}
        >
          Remove
        </Button>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </li>
  );
}

export function BoardTiles({ tiles }: { tiles: AdminTile[] }) {
  if (tiles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No drawings on the board this week.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <TileCard key={tile.id} tile={tile} />
      ))}
    </ul>
  );
}
