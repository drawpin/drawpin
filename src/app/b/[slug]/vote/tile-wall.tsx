import { PinnedDrawing } from "../pinned-drawing";
import type { Tile } from "../tiles";
import { DrawingsHeading, DrawingsList } from "./drawings-list";

/**
 * Last week's board, to look at rather than vote on: shown to anyone not
 * signed in, and to anyone out of votes.
 *
 * Hiding the drawings behind the sign-in prompt left people staring at a wall
 * and asked them to take our word for it that there was something worth
 * voting on.
 */
export function TileWall({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="flex flex-col gap-4">
      <DrawingsHeading />
      <DrawingsList>
        {tiles.map((tile, index) => (
          <PinnedDrawing key={tile.id} tile={tile} index={index} />
        ))}
      </DrawingsList>
    </section>
  );
}
