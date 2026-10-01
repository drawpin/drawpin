import type { ProtoTile } from "./data";
import { hand } from "./fonts";

/**
 * Who drew it and what they called it, written on the paper under the
 * drawing like a polaroid, so it reads the same on any board.
 */
export function TileCaption({
  tile,
  large = false,
}: {
  tile: ProtoTile;
  large?: boolean;
}) {
  // "Ahmad#4821": the name in ink, the tag that tells namesakes apart in grey.
  const [name, tag] = tile.author.split("#");
  return (
    <span className={`block min-w-0 px-1 ${large ? "pt-3 pb-1" : "pt-2"}`}>
      <span
        className={`block leading-snug font-bold break-words text-[#0f1b2d] ${large ? "text-base" : "text-sm"}`}
      >
        {name}
        {tag && <span className="font-medium text-[#525252]">#{tag}</span>}
      </span>
      {tile.caption && (
        <span
          className={`${hand.className} block truncate leading-tight text-[#525252] ${large ? "text-2xl" : "text-lg"}`}
        >
          &ldquo;{tile.caption}&rdquo;
        </span>
      )}
    </span>
  );
}
