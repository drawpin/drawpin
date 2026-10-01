/**
 * A push pin seen from above: a solid head with a crisp rim, one highlight,
 * and a soft shadow cast down and to the right, so it reads as stuck into
 * the board. Built from flat layers rather than one gradient, which goes
 * muddy at this size. Positioned by the caller.
 */
export function Pin({
  color,
  size = 18,
  className = "",
  delayMs,
}: {
  color: string;
  size?: number;
  className?: string;
  /** When a `pin-pop` entrance should start, to stagger a row of pins. */
  delayMs?: number;
}) {
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
      <span className="absolute inset-0 translate-x-[2px] translate-y-[3px] rounded-full bg-[#0f1b2d]/30 blur-[2px]" />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow:
            "inset 0 0 0 1px rgb(15 27 45 / 0.18), inset 0 -2px 0 rgb(15 27 45 / 0.15)",
        }}
      />
      <span className="absolute top-[18%] left-[22%] size-[34%] rounded-full bg-white/85" />
    </span>
  );
}
