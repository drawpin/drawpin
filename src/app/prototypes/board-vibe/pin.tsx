import { useId } from "react";

/** The tacks' colours, from the palette, cycled across the board. */
export const TACK_COLORS = ["#004aad", "#ffca39", "#ff821b", "#6badfa"];

/** Shades of one plastic colour: `amount`% of ink (dark) or white (light). */
const dark = (color: string, amount: number) =>
  `color-mix(in oklab, ${color}, #0f1b2d ${amount}%)`;
const light = (color: string, amount: number) =>
  `color-mix(in oklab, ${color}, #ffffff ${amount}%)`;

/**
 * A push pin, after the reference photo the user picked (2026-10-01): clear
 * coloured plastic with a wide base, a narrow waisted neck and a flared,
 * dished cap, leaning up and to the right with a short steel needle stuck
 * into the paper. Drawn upright in SVG and tilted as a whole, so the shading
 * leans with it.
 *
 * The needle's tip sits at the bottom-left of the box. The caller positions
 * the box so that tip lands on the paper; `pin-pop` pushes it in from there.
 */
export function Pin({
  color,
  size = 34,
  className = "",
  delayMs,
}: {
  color: string;
  /** The box's width in px; its height follows the drawing's 4:5 shape. */
  size?: number;
  className?: string;
  /** When a `pin-pop` entrance should start, to stagger a row of tacks. */
  delayMs?: number;
}) {
  // Gradient ids must be unique on the page: there's a tack per drawing.
  const id = useId().replace(/:/g, "");
  const body = `${id}-body`;
  const face = `${id}-face`;
  const steel = `${id}-steel`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 50"
      width={size}
      height={(size * 50) / 40}
      className={`absolute z-10 overflow-visible ${className}`}
      style={{
        animationDelay: delayMs === undefined ? undefined : `${delayMs}ms`,
        // The shadow falls down and right, onto the paper beneath it.
        filter: "drop-shadow(3px 4px 2.5px rgb(15 27 45 / 0.32))",
      }}
    >
      <defs>
        {/* Across the plastic: a dark edge, a bright band where the light
            comes through on the left, the colour, then dark again. */}
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={dark(color, 45)} />
          <stop offset="0.22" stopColor={light(color, 45)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={dark(color, 40)} />
        </linearGradient>
        <radialGradient id={face} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={light(color, 35)} />
          <stop offset="0.7" stopColor={color} />
          <stop offset="1" stopColor={dark(color, 20)} />
        </radialGradient>
        <linearGradient id={steel} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#8a929c" />
          <stop offset="0.45" stopColor="#f2f4f7" />
          <stop offset="1" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      {/* Upright pin, needle tip at (20, 60), tilted about that tip and then
          moved so the tip is the box's bottom-left corner. */}
      <g transform="translate(-17 -12) rotate(34 20 60)" fillOpacity="0.94">
        {/* Needle: only its last few px show; the rest is in the paper. */}
        <path
          d="M19.1 47 L20.9 47 L20.15 60 L19.85 60 Z"
          fill={`url(#${steel})`}
        />

        {/* Base: the rim's thickness, then its top face. */}
        <path
          d="M4 39 L4 42 A16 5.6 0 0 0 36 42 L36 39 Z"
          fill={dark(color, 35)}
        />
        <ellipse cx="20" cy="39" rx="16" ry="5.6" fill={`url(#${face})`} />
        <ellipse cx="20" cy="38.4" rx="6.2" ry="2.2" fill={dark(color, 25)} />

        {/* Neck, pinched at the waist. */}
        <path
          d="M15.6 38.6 C16.4 31 17.3 26 16.6 18 L23.4 18 C22.7 26 23.6 31 24.4 38.6 Z"
          fill={`url(#${body})`}
        />

        {/* Cap: the flare up from the neck, its rim, and a dished top. */}
        <path
          d="M16.6 18.5 C14 17 9.5 16 8 13.6 A12 4.4 0 0 0 32 13.6 C30.5 16 26 17 23.4 18.5 Z"
          fill={`url(#${body})`}
        />
        <path
          d="M8 11.6 L8 13.6 A12 4.4 0 0 0 32 13.6 L32 11.6 Z"
          fill={dark(color, 30)}
        />
        <ellipse cx="20" cy="11.6" rx="12" ry="4.4" fill={`url(#${face})`} />
        <ellipse
          cx="20.4"
          cy="11.9"
          rx="7.6"
          ry="2.6"
          fill={light(color, 18)}
          stroke={dark(color, 22)}
          strokeWidth="0.8"
        />

        {/* Highlights where the light catches the plastic. */}
        <path
          d="M17.9 21 C18.4 26 18 31 17.6 36"
          stroke="white"
          strokeOpacity="0.75"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="12.5"
          cy="37.6"
          rx="3.6"
          ry="1.3"
          fill="white"
          fillOpacity="0.6"
          transform="rotate(-12 12.5 37.6)"
        />
        <ellipse
          cx="14"
          cy="10.6"
          rx="2.8"
          ry="1"
          fill="white"
          fillOpacity="0.7"
          transform="rotate(-14 14 10.6)"
        />
      </g>
    </svg>
  );
}
