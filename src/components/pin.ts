import type { CSSProperties } from "react";

/** The pins' colours, from the palette: deep blue, yellow, orange, light blue. */
export const PIN_COLORS = ["#004aad", "#ffca39", "#ff821b", "#6badfa"] as const;

export type PinColor = (typeof PIN_COLORS)[number];

/**
 * A steady pin colour for something with an id, so a drawing keeps its pin
 * colour across renders and visits.
 */
export function pinColorFor(id: string): PinColor {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return PIN_COLORS[sum % PIN_COLORS.length];
}

/**
 * A push pin drawn flat in DrawPin's own style: ink outline, palette fill and
 * one highlight, leaning up and to the right (UI pass, 2026-10-01). Its
 * needle's tip is at (5, 29) of a 26 × 30 box, which `.pinned` in
 * globals.css relies on to stick it into the top edge.
 *
 * The box starts 2 units left of the drawing's origin: tilted, the lower
 * cap reaches about a unit past x = 0, and an SVG used as an image is
 * always clipped to its box, so a tighter one cut the cap off flat.
 */
function pinImage(color: PinColor): string {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-2 0 26 30'>" +
    "<g transform='translate(-10 -2) rotate(30 13 31)' stroke='#0f1b2d' stroke-width='1.5' stroke-linejoin='round' fill='" +
    color +
    "'>" +
    "<path d='M13 23v8' stroke-linecap='round'/>" +
    "<rect x='4' y='19' width='18' height='5' rx='2.5'/>" +
    "<path d='M10 19.5v-10h6v10'/>" +
    "<rect x='6' y='4' width='14' height='6' rx='3'/>" +
    "<path d='M11.8 11.5v5.5' stroke='white' stroke-width='1.3' stroke-linecap='round' stroke-opacity='0.8'/>" +
    "</g></svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * The inline style that gives a `.pinned` element its pin. The pin is the
 * element's `::before`, so it adds nothing to the DOM; add `pin-pop` to the
 * class to push it in on load, `delayMs` after the page appears.
 *
 * @example <div className="pinned pin-pop relative" style={pinStyle("#004aad")} />
 */
export function pinStyle(color: PinColor, delayMs = 0): CSSProperties {
  return {
    "--pin": pinImage(color),
    "--pin-delay": `${delayMs}ms`,
  } as CSSProperties;
}
