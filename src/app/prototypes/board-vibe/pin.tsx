import Image from "next/image";

/** The tacks' colours, from the palette, cycled across the board. */
export const TACK_COLORS = ["#004aad", "#ffca39", "#ff821b", "#6badfa"];

/**
 * Each colour's image in `public/pins/`: push pins generated in Canva
 * (2026-10-01) after the reference photo the user picked, the deep blue first
 * and the others recoloured from it so all four match. Backgrounds removed in
 * Canva; cropped to one shared box with the needle cut short, so only the
 * stub above the paper shows.
 */
const IMAGES: Record<string, string> = {
  "#004aad": "/pins/blue.webp",
  "#ffca39": "/pins/yellow.webp",
  "#ff821b": "/pins/orange.webp",
  "#6badfa": "/pins/sky.webp",
};

/** The images' shape, and how far across them the needle's cut end is. */
const ASPECT = 144 / 117;
const TIP_X = 0.192;

/**
 * A push pin stuck into the top of whatever it's placed in (the parent must
 * be positioned). The pin is centred and its needle goes in `depth` px below
 * the top edge; since the pin leans up and right, that's left of centre.
 */
export function Pin({
  color,
  size = 30,
  depth = 6,
  className = "",
  delayMs,
}: {
  /** One of `TACK_COLORS`. */
  color: string;
  /** The pin's width in px. */
  size?: number;
  /** How far below the top edge the needle goes in, in px. */
  depth?: number;
  className?: string;
  /** When a `pin-pop` entrance should start, to stagger a row of pins. */
  delayMs?: number;
}) {
  const height = Math.round(size * ASPECT);
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 ${className}`}
      style={{
        width: size,
        height,
        top: depth - height,
        left: `calc(50% - ${size / 2}px)`,
        animationDelay: delayMs === undefined ? undefined : `${delayMs}ms`,
      }}
    >
      {/* Where the needle goes into the paper. */}
      <span
        className="absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f1b2d]/45 blur-[0.5px]"
        style={{ left: size * TIP_X, top: height - 0.5 }}
      />
      <Image
        src={IMAGES[color] ?? IMAGES["#004aad"]}
        alt=""
        width={117}
        height={144}
        unoptimized
        draggable={false}
        className="relative size-full drop-shadow-[4px_6px_3px_rgb(15_27_45/0.35)]"
      />
    </span>
  );
}
