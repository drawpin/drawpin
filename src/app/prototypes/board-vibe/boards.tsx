import type { ReactNode } from "react";
import { TACK_COLORS } from "./pin";

/**
 * What the drawings are pinned to, the one thing round eight compares. The
 * user asked for an actual board, "a place where people pin things, but fit
 * the color palette" (2026-10-01):
 * - `cork`: a cork board, warmed toward the palette's yellow and orange.
 * - `felt`: a fabric memo board in the light blue.
 * - `navy`: the same fabric in the deep blue, so the white paper pops most.
 */
export type Surface = "cork" | "felt" | "navy";

/**
 * Grain as a tiling SVG noise texture: `feTurbulence` coloured by a matrix
 * whose last row turns the noise into transparency, so only specks show over
 * the board's base colour. No image files, and it stays crisp at any density.
 */
function grain({
  frequency,
  rgb,
  alpha,
  size = 180,
}: {
  frequency: number;
  /** The specks' colour, each channel 0 to 1. */
  rgb: [number, number, number];
  /** How the noise maps to opacity: `[gain, offset]`. */
  alpha: [number, number];
  size?: number;
}) {
  const [r, g, b] = rgb;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${alpha[0]} 0 0 0 ${alpha[1]}'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/#/g, "%23")}")`;
}

const SURFACES: Record<
  Surface,
  { base: string; layers: string[]; frame: string }
> = {
  cork: {
    // Cork, nudged toward the palette's yellow and orange.
    base: "#c99a45",
    layers: [
      grain({ frequency: 0.55, rgb: [0.55, 0.3, 0.06], alpha: [1.8, -0.75] }),
      grain({ frequency: 0.9, rgb: [1, 0.85, 0.45], alpha: [1.6, -0.8] }),
    ],
    frame: "#004aad",
  },
  felt: {
    base: "color-mix(in oklab, #6badfa 70%, #ffffff)",
    layers: [
      grain({ frequency: 1.4, rgb: [0, 0.29, 0.68], alpha: [1.1, -0.45] }),
      grain({ frequency: 1.1, rgb: [1, 1, 1], alpha: [1.2, -0.55] }),
    ],
    frame: "#004aad",
  },
  navy: {
    base: "#004aad",
    layers: [
      grain({ frequency: 1.4, rgb: [0.06, 0.1, 0.18], alpha: [1.3, -0.5] }),
      grain({ frequency: 1.1, rgb: [0.42, 0.68, 0.98], alpha: [1.2, -0.6] }),
    ],
    frame: "#0f1b2d",
  },
};

/** The tacks for a board: the deep blue ones would vanish into the navy. */
export function tacksFor(surface: Surface): string[] {
  return surface === "navy"
    ? TACK_COLORS.filter((color) => color !== "#004aad")
    : TACK_COLORS;
}

/**
 * The board itself: a framed panel with the surface's texture, sunk a little
 * into its frame. Everything pinned up goes inside it.
 */
export function Board({
  surface,
  children,
}: {
  surface: Surface;
  children: ReactNode;
}) {
  const { base, layers, frame } = SURFACES[surface];
  return (
    <div
      className="rounded-2xl border-[10px] shadow-[0_10px_24px_rgb(15_27_45/0.18)]"
      style={{ borderColor: frame }}
    >
      <div
        className="rounded-md shadow-[inset_0_2px_10px_rgb(15_27_45/0.35)]"
        style={{ backgroundColor: base, backgroundImage: layers.join(",") }}
      >
        {children}
      </div>
    </div>
  );
}
