import {
  CloudIcon,
  FlowerIcon,
  HeartIcon,
  LightningIcon,
  MusicNotesIcon,
  PaintBrushIcon,
  PaletteIcon,
  PencilSimpleIcon,
  RainbowIcon,
  ScribbleLoopIcon,
  SmileyIcon,
  SparkleIcon,
  StarIcon,
  SunIcon,
} from "@phosphor-icons/react";

/**
 * The motion the backdrops and the living board use. Seen every visit, so
 * it's slow and quiet (design-motion-principles' frequency gate), it only
 * moves transform properties, and it's all off for reduced motion.
 */
export const BACKDROP_CSS = `
@keyframes glow-drift-a { from { translate: 0 0; } to { translate: 60px 90px; } }
@keyframes glow-drift-b { from { translate: 0 0; } to { translate: -70px -50px; } }
@keyframes glow-drift-c { from { translate: 0 0; } to { translate: 40px -80px; } }
@keyframes pin-pop {
  from { scale: 1.9; opacity: 0; }
  to { scale: 1; opacity: 1; }
}
@keyframes board-sway {
  from { rotate: var(--swing); translate: 0 16px; opacity: 0.35; }
  to { rotate: 0deg; translate: 0 0; opacity: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .glow-a { animation: glow-drift-a 38s ease-in-out infinite alternate; }
  .glow-b { animation: glow-drift-b 46s ease-in-out infinite alternate; }
  .glow-c { animation: glow-drift-c 42s ease-in-out infinite alternate; }
  .pin-pop { animation: pin-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  @supports (animation-timeline: view()) {
    .board-sway {
      transform-origin: 50% 0;
      animation: board-sway linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
    }
  }
}
`;

/**
 * Glow: big soft clouds of blue and yellow drifting behind the board. Only
 * colour and light, no shapes, so the white frames stand out against it.
 */
export function GlowBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="glow-a absolute -top-24 -left-32 size-[26rem] rounded-full bg-[#6badfa]/50 blur-3xl" />
      <span className="glow-b absolute top-[28rem] -right-32 size-[24rem] rounded-full bg-[#ffca39]/45 blur-3xl" />
      <span className="glow-c absolute top-[62rem] -left-24 size-[28rem] rounded-full bg-[#6badfa]/45 blur-3xl" />
      <span className="glow-a absolute top-[92rem] -right-24 size-[22rem] rounded-full bg-[#ffca39]/40 blur-3xl" />
    </div>
  );
}

const DOODLES = [
  StarIcon,
  ScribbleLoopIcon,
  HeartIcon,
  PencilSimpleIcon,
  SparkleIcon,
  SmileyIcon,
  MusicNotesIcon,
  PaletteIcon,
  LightningIcon,
  CloudIcon,
  FlowerIcon,
  SunIcon,
  PaintBrushIcon,
  RainbowIcon,
];

/**
 * Doodles: a sparse wallpaper of the kind of thing people draw, faint and
 * tilted. Laid out on a loose grid with a steady jitter, so it never
 * reshuffles and never clumps over a drawing more in one place than another.
 */
export function DoodleBackdrop() {
  const rows = 22;
  const columns = 4;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden text-[#004aad]/[0.13]"
    >
      {Array.from({ length: rows * columns }, (_, index) => {
        const Doodle = DOODLES[(index * 5) % DOODLES.length];
        const row = Math.floor(index / columns);
        const column = index % columns;
        const jitterX = ((index * 37) % 11) - 5;
        const jitterY = ((index * 53) % 13) - 6;
        return (
          <Doodle
            key={index}
            weight="bold"
            className="absolute"
            style={{
              left: `calc(${(column + (row % 2 ? 0.5 : 0)) * 25}% + ${jitterX * 4}px)`,
              top: `${row * 110 + jitterY * 4}px`,
              width: 30 + ((index * 7) % 3) * 8,
              height: 30 + ((index * 7) % 3) * 8,
              rotate: `${((index * 29) % 50) - 25}deg`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Alive's backdrop: a calm gradient, since the drawings do the moving. */
export function CalmBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, #edf5ff 0%, #ffffff 35%, #ffffff 65%, #edf5ff 100%)",
      }}
    />
  );
}
