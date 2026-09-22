import Image from "next/image";
import type { Tile } from "../tiles";

const ABOVE_THE_FOLD_TILES = 4;

/**
 * Last week's board, to look at rather than vote on.
 *
 * Shown to anyone not signed in. Hiding the drawings behind the sign-in
 * prompt left them staring at a wall and asked them to take our word for it
 * that there was something worth voting on.
 */
export function TileWall({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {tiles.map((tile, index) => (
        <li key={tile.id} className="flex flex-col gap-1">
          <Image
            src={tile.imageUrl}
            loading={index < ABOVE_THE_FOLD_TILES ? "eager" : "lazy"}
            alt={tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`}
            width={512}
            height={512}
            unoptimized
            className="aspect-square w-full rounded-lg border bg-white object-cover"
          />
          {tile.caption && (
            <p className="line-clamp-2 text-sm break-words">{tile.caption}</p>
          )}
          <p className="text-muted-foreground truncate text-xs">
            {tile.author ?? "Guest"}
            {tile.isGuest && tile.author && " · guest"}
          </p>
        </li>
      ))}
    </ul>
  );
}
