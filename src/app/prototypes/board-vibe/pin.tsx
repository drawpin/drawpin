/** The tacks' colours, from the palette, cycled across the board. */
export const TACK_COLORS = ["#ffca39", "#ff821b", "#6badfa", "#004aad"];

/**
 * A thumb tack seen from just above: a flat round cap with a darker rim, a
 * raised centre, one sharp highlight, and a shadow thrown down and to the
 * right as if it's pushed in at a slight angle. Built from flat layers, which
 * stay crisp at this size. Positioned by the caller.
 */
export function Pin({
  color,
  size = 20,
  className = "",
  delayMs,
}: {
  color: string;
  size?: number;
  className?: string;
  /** When a `pin-pop` entrance should start, to stagger a row of tacks. */
  delayMs?: number;
}) {
  const rim = `color-mix(in oklab, ${color}, #0f1b2d 28%)`;
  const dome = `color-mix(in oklab, ${color}, #ffffff 22%)`;
  return (
    <span
      aria-hidden
      className={`absolute z-10 ${className}`}
      style={{
        width: size,
        height: size,
        animationDelay: delayMs === undefined ? undefined : `${delayMs}ms`,
      }}
    >
      {/* The shadow, and the shaft's shadow running off from it. */}
      <span className="absolute inset-0 translate-x-[3px] translate-y-[4px] rounded-full bg-[#0f1b2d]/30 blur-[2px]" />
      <span className="absolute top-1/2 left-1/2 h-[2px] w-[45%] origin-left translate-y-[3px] rotate-[35deg] rounded-full bg-[#0f1b2d]/25 blur-[1px]" />
      {/* The cap, its rim, and the raised centre. */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `inset 0 0 0 2px ${rim}, inset 0 -2px 0 2px ${rim}`,
        }}
      />
      <span
        className="absolute inset-[26%] rounded-full"
        style={{
          backgroundColor: dome,
          boxShadow: `0 1px 1px ${rim}`,
        }}
      />
      <span className="absolute top-[22%] left-[26%] h-[22%] w-[30%] -rotate-[25deg] rounded-full bg-white/90" />
    </span>
  );
}
