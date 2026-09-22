import Image from "next/image";
import type { Finalist } from "./data";

/**
 * The month's finalists, to look at rather than vote on.
 *
 * Shown to anyone who can't vote right now — not signed in, or already voted.
 * The drawings are the point of the page, so they stay on it either way.
 */
export function FinalistWall({ finalists }: { finalists: Finalist[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {finalists.map((finalist, index) => (
        <li key={finalist.tileId} className="flex flex-col gap-1">
          <Image
            src={finalist.imageUrl}
            loading={index === 0 ? "eager" : "lazy"}
            alt={
              finalist.caption ??
              `Drawing by ${finalist.author ?? "a former member"}`
            }
            width={768}
            height={768}
            unoptimized
            className="aspect-square w-full rounded-lg border bg-white object-cover"
          />
          {finalist.caption && (
            <p className="text-sm break-words">{finalist.caption}</p>
          )}
          <p className="text-muted-foreground text-xs">
            {finalist.author ?? "A former member"} · won its week with{" "}
            {finalist.weekVotes} {finalist.weekVotes === 1 ? "vote" : "votes"}
          </p>
        </li>
      ))}
    </ul>
  );
}
