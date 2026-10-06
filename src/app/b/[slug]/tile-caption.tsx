import { hand } from "@/lib/fonts";
import type { Tile } from "./tiles";

/** What a drawing shows, for screen readers: its caption, or whose it is. */
export function describeTile(tile: Pick<Tile, "author" | "caption">): string {
  return (
    tile.caption ??
    (tile.author ? `Drawing by ${tile.author}` : "Guest drawing")
  );
}

/**
 * Who drew it and what they called it, written on the paper under the
 * drawing like a polaroid (UI pass, 2026-10-02). The name is in ink and its
 * tag, which tells namesakes apart, in grey; the caption is handwritten.
 * `large` is the size on a drawing opened up close.
 */
export function TileCaption({
  tile,
  large = false,
}: {
  tile: Tile;
  large?: boolean;
}) {
  const [name, tag] = tile.author?.split("#") ?? ["Guest"];
  return (
    <span className="block min-w-0">
      <span
        className={`text-foreground block leading-snug font-bold break-words ${large ? "text-base" : "text-sm"}`}
      >
        {name}
        {tag && (
          <span className="text-muted-foreground font-medium">#{tag}</span>
        )}
        {tile.isGuest && tile.author && (
          <span className="text-muted-foreground font-medium"> · guest</span>
        )}
      </span>
      {tile.caption && (
        // Clamped so one chatty caption doesn't push its neighbour's
        // drawing halfway down the screen; the close-up shows it whole.
        <span
          className={`${hand.className} text-muted-foreground block leading-tight break-words ${large ? "text-2xl" : "line-clamp-2 text-lg"}`}
        >
          &ldquo;{tile.caption}&rdquo;
        </span>
      )}
    </span>
  );
}
