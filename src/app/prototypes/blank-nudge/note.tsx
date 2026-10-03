"use client";

import { hand } from "@/lib/fonts";
import { DrawScreen } from "./screen";

/**
 * Note: a strip of yellow paper under the canvas, handwritten, like the
 * board's "Pinned up this week". It pops in on each blank Post, so a second
 * try shows it again rather than leaving it sitting there. Axis: placement
 * and personality, a note in the board's voice.
 */
export function Note() {
  return (
    <DrawScreen
      slots={({ active, attempt }) => ({
        belowCanvas: active ? (
          <p
            key={attempt}
            role="status"
            className={`${hand.className} nudge-note bg-winner text-foreground w-fit -rotate-2 px-4 pt-1 pb-0.5 text-2xl leading-tight font-bold shadow-[0_2px_3px_rgb(15_27_45/0.18),0_6px_12px_rgb(15_27_45/0.14)]`}
          >
            Nothing drawn yet. Add a doodle, then post it.
            <style>{`
              @keyframes nudge-note {
                from { opacity: 0; scale: 0.92; translate: 0 6px; }
              }
              @media (prefers-reduced-motion: no-preference) {
                .nudge-note {
                  transform-origin: 20% 100%;
                  animation: nudge-note 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
                }
              }
            `}</style>
          </p>
        ) : null,
      })}
    />
  );
}
