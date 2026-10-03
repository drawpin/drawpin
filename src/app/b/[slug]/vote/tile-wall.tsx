import { PinnedDrawing } from "../pinned-drawing";
import type { Tile } from "../tiles";
import { DrawingsHeading, DrawingsList } from "./drawings-list";

/**
 * Last week's board, to look at rather than vote on: shown to anyone who
 * has used all their votes this week. (Someone signed out gets
 * `SignInToVote`, where tapping a drawing asks them to sign in.)
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
