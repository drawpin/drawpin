import Image from "next/image";
import type { ReactNode } from "react";
import { pinColorFor, pinStyle } from "@/components/pin";
import { PAPER } from "./board-look";
import { describeTile, TileCaption } from "./tile-caption";
import { type Tile, tiltFor } from "./tiles";

/** The first rows are on screen at load; lazy-loading them delays the largest paint. */
const ABOVE_THE_FOLD = 4;
/** Drawings whose pins go in one after another; the rest go in together. */
const STAGGERED = 8;

/**
 * A drawing pinned up on paper with its name and caption, for the vote page
 * (the board's feed builds its own, with a close-up and Report). Given
 * `onPick` it's a toggle button, for picking it to vote for; without, it's
 * just the drawing. `badge` sits on the paper's corner.
 */
export function PinnedDrawing({
  tile,
  index,
  picked = false,
  disabled = false,
  onPick,
  badge,
  dim = false,
}: {
  tile: Tile;
  /** Its place in the list, for staggering the pins and loading eagerly. */
  index: number;
  picked?: boolean;
  disabled?: boolean;
  onPick?: () => void;
  badge?: ReactNode;
  /** Shown but out of the running, like your own drawing. */
  dim?: boolean;
}) {
  const style = {
    ...pinStyle(pinColorFor(tile.id), index < STAGGERED ? 150 + index * 60 : 0),
    "--lean": `${tiltFor(tile.id)}deg`,
  } as React.CSSProperties;
  const className = `vote-paper pinned pin-pop relative flex w-full flex-col gap-2 p-1.5 pb-2 text-left ${PAPER} ${dim ? "opacity-65" : ""}`;
  const content = (
    <>
      <Image
        src={tile.imageUrl}
        loading={index < ABOVE_THE_FOLD ? "eager" : "lazy"}
        alt={describeTile(tile)}
        width={512}
        height={512}
        // Tiles are already small WebP files served from the storage CDN.
        unoptimized
        className="aspect-square w-full object-cover"
      />
      <span className="px-1">
        <TileCaption tile={tile} />
      </span>
      {badge}
    </>
  );

  return onPick ? (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={picked}
      style={style}
      className={`${className} focus-visible:ring-highlight cursor-pointer outline-none focus-visible:ring-3 disabled:cursor-default`}
    >
      {content}
    </button>
  ) : (
    <div style={style} className={className}>
      {content}
    </div>
  );
}

/** A label on a drawing's corner: why it can't be picked, or that it was. */
export function CornerLabel({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "voted";
}) {
  return (
    <span
      className={`border-foreground absolute top-3 left-3 rounded-md border-2 px-2 py-0.5 text-xs font-bold ${tone === "voted" ? "bg-success text-white" : "text-foreground bg-white"}`}
    >
      {children}
    </span>
  );
}
