/** The tacks' colours, from the palette, cycled across the board. */
export const TACK_COLORS = ["#004aad", "#ffca39", "#ff821b", "#6badfa"];

/**
 * A push pin drawn flat in the page's own style: ink outline, palette fill,
 * one highlight. Shaped after the user's reference photo (2026-10-01): wide
 * base, narrow neck, a cap on top, leaning up and to the right with the
 * needle's tip at (3, 29) of a 24 × 30 box.
 *
 * Returned as a CSS `url()` so the pin can be a `::before` on whatever it
 * holds up (see `PIN_CSS`), which adds nothing to the DOM.
 */
function pinImage(color: string): string {
  const ink = "#0f1b2d";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 30'><g transform='translate(-10 -2) rotate(30 13 31)' stroke='${ink}' stroke-width='1.5' stroke-linejoin='round' fill='${color}'><path d='M13 23v8' stroke-linecap='round'/><rect x='4' y='19' width='18' height='5' rx='2.5'/><path d='M10 19.5v-10h6v10'/><rect x='6' y='4' width='14' height='6' rx='3'/><path d='M11.8 11.5v5.5' stroke='white' stroke-width='1.3' stroke-linecap='round' stroke-opacity='0.8'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * The style that pins an element up: put it with the `pinned` class (and
 * `pin-pop` to push it in on load). `delayMs` staggers a row of them.
 */
export function pinStyle(color: string, delayMs = 0): React.CSSProperties {
  return {
    "--pin": pinImage(color),
    "--pin-delay": `${delayMs}ms`,
  } as React.CSSProperties;
}

/**
 * The pin itself, as the pinned element's `::before`: centred, with its
 * needle 5px into the top edge, and a hard ink shadow like the buttons'.
 * `pinned-lg` is the bigger pin on a drawing opened up close.
 */
export const PIN_CSS = `
.pinned::before {
  content: "";
  position: absolute;
  z-index: 10;
  width: calc(24px * var(--pin-scale, 1));
  height: calc(30px * var(--pin-scale, 1));
  top: calc((5px - 29px) * var(--pin-scale, 1));
  left: calc(50% - 12px * var(--pin-scale, 1));
  background: var(--pin) center / contain no-repeat;
  filter: drop-shadow(2px 2px 0 rgb(15 27 45 / 0.28));
  transform-origin: 12.5% 97%;
  pointer-events: none;
}
.pinned-lg { --pin-scale: 1.5; }
`;
