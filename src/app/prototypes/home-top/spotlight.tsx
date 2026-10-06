import { Half } from "./logo-halves";
import { SwapPoster } from "./swap";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Spotlight: the whole logo is always there, and the light moves along it.
 * At rest "draw" is lit and "pin" waits faded; on a hover "draw" steps back
 * and "pin" pops up, its pen tipping like it's about to write.
 */
export function Spotlight() {
  return (
    <SwapPoster
      render={(on) => (
        <span className="flex items-end">
          <Half
            word="draw"
            className="origin-bottom-right transition-[opacity,transform] duration-300 motion-reduce:duration-0"
            style={{
              opacity: on ? 0.35 : 1,
              transform: on ? "scale(0.94)" : "none",
              transitionTimingFunction: OUT,
            }}
          />
          <Half
            word="pin"
            className="origin-bottom-left transition-[opacity,transform] motion-reduce:duration-0"
            style={{
              opacity: on ? 1 : 0.35,
              transform: on ? "scale(1.08) rotate(-3deg)" : "scale(0.94)",
              transitionDuration: on ? "420ms" : "250ms",
              transitionTimingFunction: on ? SPRING : OUT,
            }}
          />
        </span>
      )}
    />
  );
}
