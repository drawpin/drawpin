import { Half } from "./logo-halves";
import { SwapPoster } from "./swap";

const OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Roll: one word of the logo at a time, in the same spot. On a hover "draw"
 * rolls up out of sight and "pin" rolls up into its place; off, they roll
 * back down.
 */
export function Roll() {
  return (
    <SwapPoster
      render={(on) => (
        <span className="inline-grid overflow-hidden">
          <Half
            word="draw"
            className="col-start-1 row-start-1 transition-transform duration-[450ms] motion-reduce:duration-0"
            style={{
              transform: on ? "translateY(-105%)" : "none",
              transitionTimingFunction: OUT,
            }}
          />
          <Half
            word="pin"
            className="col-start-1 row-start-1 transition-transform duration-[450ms] motion-reduce:duration-0"
            style={{
              transform: on ? "none" : "translateY(105%)",
              transitionTimingFunction: OUT,
            }}
          />
        </span>
      )}
    />
  );
}
