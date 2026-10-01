import { Caveat } from "next/font/google";

/** The handwriting the sketchbook directions use for notes and captions. */
export const hand = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

/** Washi tape in the brand's light colours, see-through like the real thing. */
export const TAPES = [
  "rgb(255 202 57 / 0.75)",
  "rgb(107 173 250 / 0.65)",
  "rgb(255 130 27 / 0.6)",
];

/** Blue dot-grid paper, the sketchbook page behind everything. */
export const DOT_GRID = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "radial-gradient(circle, rgb(107 173 250 / 0.35) 1.2px, transparent 1.3px)",
  backgroundSize: "22px 22px",
} as const;
