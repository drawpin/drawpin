import { PinnedDrawing } from "../pinned-drawing";
import { DrawingsList } from "../vote/drawings-list";
import type { Finalist } from "./data";
import { finalistTile, WonItsWeek } from "./finalists";

/**
 * The month's finalists, to look at rather than vote on: shown once this
 * account has voted. (Someone signed out gets `SignInToVote`, where tapping a
 * finalist asks them to sign in.) Pinned polaroids, as on the board.
 */
export function FinalistWall({ finalists }: { finalists: Finalist[] }) {
  return (
    <DrawingsList>
      {finalists.map((finalist, index) => (
        <div key={finalist.tileId} className="flex flex-col gap-2">
          <PinnedDrawing tile={finalistTile(finalist)} index={index} />
          <WonItsWeek finalist={finalist} />
        </div>
      ))}
    </DrawingsList>
  );
}
