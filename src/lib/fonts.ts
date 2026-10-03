import { Caveat } from "next/font/google";

/**
 * The handwriting the board uses for its notes and the drawings' captions
 * (UI pass, chosen 2026-10-02). Body text stays in Geist.
 */
export const hand = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
