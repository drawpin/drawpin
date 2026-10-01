/**
 * The board's motion, after the user asked for a site that feels awake
 * (2026-10-01). Weighted Jakub, then Jhey (design-motion-principles): it's a
 * playful consumer page, but people open it every day, so nothing loops fast
 * and every loop spends most of its time at rest.
 *
 * - `pin-pop`: a pin (`pin.tsx`) is pushed into the paper on load, about its
 *   needle's tip.
 * - `board-sway`: a drawing swings into place on its tack as it scrolls in.
 * - `draw-awake`: the Draw button's pencil scribbles every few seconds.
 * - `vote-awake`: the vote card's drawings hop in turn and its arrow nudges.
 * - `tile-frame`: on hover, a drawing lifts and swings a little on its tack.
 *
 * Only `translate`, `rotate`, `scale`, `opacity` and shadows move. Hover only
 * applies where there's a real pointer, and it's all off for reduced motion.
 */
export const MOTION_CSS = `
@keyframes pin-pop {
  from { scale: 1.45; translate: 6px -12px; opacity: 0; }
  55% { opacity: 1; }
  to { scale: 1; translate: 0 0; opacity: 1; }
}
@keyframes board-sway {
  from { rotate: var(--swing); translate: 0 16px; opacity: 0.35; }
  to { rotate: 0deg; translate: 0 0; opacity: 1; }
}
@keyframes pencil-scribble {
  0%, 16%, 100% { rotate: 0deg; translate: 0 0; }
  3% { rotate: -16deg; translate: -1px 1px; }
  6% { rotate: 12deg; translate: 1px 0; }
  9% { rotate: -9deg; translate: -1px 1px; }
  12% { rotate: 5deg; translate: 0 0; }
}
@keyframes peek-hop {
  0%, 9%, 100% { translate: 0 0; }
  3% { translate: 0 -7px; }
  6% { translate: 0 1px; }
}
@keyframes arrow-nudge {
  0%, 12%, 100% { translate: 0 0; }
  4% { translate: 5px 0; }
  8% { translate: -1px 0; }
}
@media (prefers-reduced-motion: no-preference) {
  .pin-pop::before {
    animation: pin-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--pin-delay, 0ms) both;
  }
  @supports (animation-timeline: view()) {
    .board-sway {
      transform-origin: 50% 0;
      animation: board-sway linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
    }
  }
  .draw-awake svg {
    transform-origin: 15% 85%;
    animation: pencil-scribble 6s cubic-bezier(0.37, 0, 0.63, 1) 1.4s infinite;
  }
  .vote-awake .peek {
    animation: peek-hop 7s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }
  .vote-awake .arrow {
    animation: arrow-nudge 7s cubic-bezier(0.34, 1.56, 0.64, 1) 2.9s infinite;
  }
  .tile-frame {
    transition:
      rotate 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
      translate 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
      scale 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 380ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  @media (hover: hover) and (pointer: fine) {
    .tile-frame:hover {
      rotate: var(--hover-swing);
      translate: 0 -6px;
      scale: 1.05;
      box-shadow:
        0 4px 6px rgb(0 74 173 / 0.12),
        0 22px 36px rgb(0 74 173 / 0.2);
    }
  }
}
`;
