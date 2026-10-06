import { hand } from "@/lib/fonts";
import { SwapPoster } from "./swap";

/** A loose back-and-forth pen line, in a 100×20 box stretched over the word. */
const SCRIBBLE =
  "M2 12 C 14 4, 22 18, 34 9 S 52 17, 62 8 S 80 16, 98 7 M96 13 C 80 19, 66 6, 50 15 S 22 8, 4 16";

/**
 * Scribble: "Draw it." gets crossed out in pen, the way the podium's
 * backgrounds get scribbled in, and "Pin it." is written in by hand over it.
 */
export function Scribble() {
  return (
    <SwapPoster
      render={(on) => (
        <span className="relative inline-block">
          <span
            className="inline-block transition-opacity duration-300 ease-out"
            style={{ opacity: on ? 0.55 : 1 }}
          >
            Draw it.
          </span>
          <svg
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-[-2%] top-[30%] h-[40%] w-[104%] overflow-visible"
          >
            <path
              d={SCRIBBLE}
              pathLength={1}
              fill="none"
              stroke="var(--winner)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={1}
              className="transition-[stroke-dashoffset] motion-reduce:duration-0"
              style={{
                strokeDashoffset: on ? 0 : 1,
                transitionDuration: on ? "380ms" : "200ms",
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            />
          </svg>
          <span
            className={`${hand.className} text-winner absolute top-[-0.32em] right-[-0.35em] origin-bottom-left text-[0.62em] font-bold tracking-normal whitespace-nowrap transition-[opacity,transform] ease-out motion-reduce:duration-0`}
            style={{
              opacity: on ? 1 : 0,
              transform: on
                ? "rotate(-8deg) scale(1)"
                : "rotate(-8deg) scale(0.8)",
              transitionDuration: on ? "260ms" : "150ms",
              transitionDelay: on ? "240ms" : "0ms",
            }}
          >
            Pin it!
          </span>
        </span>
      )}
    />
  );
}
