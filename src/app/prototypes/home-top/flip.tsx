import { SwapPoster } from "./swap";

/**
 * Flip: the word is a card. "Draw it." on the front, "Pin it." on the back
 * in yellow, turning over top to bottom.
 */
export function Flip() {
  return (
    <SwapPoster
      render={(on) => (
        <span className="inline-grid [perspective:1200px]">
          <span
            className="col-start-1 row-start-1 inline-grid transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] [transform-style:preserve-3d] motion-reduce:duration-0"
            style={{ transform: on ? "rotateX(-180deg)" : "none" }}
          >
            <span className="col-start-1 row-start-1 [backface-visibility:hidden]">
              Draw it.
            </span>
            <span
              className="text-winner col-start-1 row-start-1 [backface-visibility:hidden]"
              style={{ transform: "rotateX(180deg)" }}
            >
              Pin it.
            </span>
          </span>
        </span>
      )}
    />
  );
}
