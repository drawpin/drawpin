import type { Tile } from "../tiles";
import type { Finalist } from "./data";

/** A finalist as the shared polaroid wants it. */
export function finalistTile(finalist: Finalist): Tile {
  return {
    id: finalist.tileId,
    // An author whose account is gone still won their week.
    author: finalist.author ?? "A former member",
    caption: finalist.caption,
    isGuest: false,
    isOwn: finalist.isOwn,
    imageUrl: finalist.imageUrl,
    createdAt: "",
  };
}

/** Why it's in the final, under its polaroid. */
export function WonItsWeek({ finalist }: { finalist: Finalist }) {
  return (
    <p className="text-muted-foreground px-1 text-xs font-semibold">
      Won its week with {finalist.weekVotes}{" "}
      {finalist.weekVotes === 1 ? "vote" : "votes"}
    </p>
  );
}

/** Every finalist's line, by tile id, for `SignInToVote`'s `notes`. */
export function wonItsWeekNotes(finalists: Finalist[]) {
  return Object.fromEntries(
    finalists.map((finalist) => [
      finalist.tileId,
      <WonItsWeek key={finalist.tileId} finalist={finalist} />,
    ]),
  );
}
