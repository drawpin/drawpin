import type { CSSProperties } from "react";

/**
 * A push pin's head, lit from the top left with a small cast shadow, so it
 * reads as something stuck into the board rather than a coloured dot.
 * Positioned by the caller.
 */
export function Pin({
  color,
  size = 16,
  className = "",
  style,
}: {
  color: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`absolute z-10 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.8) 0 12%, ${color} 45%, color-mix(in oklab, ${color}, #0f1b2d 30%) 100%)`,
        boxShadow:
          "0 2px 2px rgb(15 27 45 / 0.35), 2px 4px 6px rgb(15 27 45 / 0.18)",
        ...style,
      }}
    />
  );
}
