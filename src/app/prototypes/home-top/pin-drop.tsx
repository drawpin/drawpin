import { Half } from "./logo-halves";
import { SwapPoster } from "./swap";

/**
 * In: "pin" comes down from above at a tilt, overshoots a touch and
 * settles, like a pushpin pressed in. "draw" gives a small bump as it lands.
 */
const CSS = `
@keyframes pd-in {
  0% { opacity: 0; transform: translateY(-70%) rotate(-14deg) scale(1.2); }
  55% { opacity: 1; transform: translateY(5%) rotate(3deg) scale(0.97); }
  100% { opacity: 1; transform: none; }
}
@keyframes pd-bump {
  0%, 45% { transform: none; }
  60% { transform: translateY(3%) scaleY(0.96); }
  100% { transform: none; }
}
.pd-pin { opacity: 0; transition: opacity 150ms ease-out; }
.pd-on .pd-pin { opacity: 1; animation: pd-in 480ms cubic-bezier(0.23, 1, 0.32, 1); }
.pd-on .pd-draw { animation: pd-bump 480ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .pd-on .pd-pin, .pd-on .pd-draw { animation: none; }
}
`;

/**
 * Pin drop: at rest the logo is only "draw", with the room for the rest
 * left empty. A hover drops "pin" in, completing the wordmark.
 */
export function PinDrop() {
  return (
    <SwapPoster
      render={(on) => (
        <span className={`flex items-end ${on ? "pd-on" : ""}`}>
          <style>{CSS}</style>
          <Half word="draw" className="pd-draw origin-bottom" />
          <Half word="pin" className="pd-pin origin-bottom" />
        </span>
      )}
    />
  );
}
