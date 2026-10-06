import { SwapPoster } from "./swap";

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

/** One word's letters, each sliding with a little stagger. */
function Letters({
  word,
  shown,
  from,
  className = "",
}: {
  word: string;
  shown: boolean;
  /** Where the letters wait when hidden: above (-1) or below (1). */
  from: -1 | 1;
  className?: string;
}) {
  return (
    <span
      className={`col-start-1 row-start-1 inline-flex overflow-hidden pb-[0.06em] ${className}`}
    >
      {[...word].map((letter, index) => (
        <span
          key={index}
          className="inline-block whitespace-pre transition-transform duration-[420ms] motion-reduce:duration-0"
          style={{
            transform: shown ? "none" : `translateY(${from * 110}%)`,
            transitionTimingFunction: EASE,
            transitionDelay: `${index * 30}ms`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

/**
 * Slot: the letters roll up one after another, "Draw" leaving at the top
 * as "Pin" comes in from below, and back down again.
 */
export function Slot() {
  return (
    <SwapPoster
      render={(on) => (
        <span className="inline-grid">
          <Letters word="Draw it." shown={!on} from={-1} />
          <Letters word="Pin it." shown={on} from={1} className="text-winner" />
        </span>
      )}
    />
  );
}
