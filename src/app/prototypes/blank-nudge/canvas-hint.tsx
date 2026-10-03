"use client";

import { hand } from "@/lib/fonts";
import { DrawScreen } from "./screen";

/**
 * On the canvas: the nudge appears where the drawing goes. A squiggle draws
 * itself across the empty tile with the words under it, and the tile's
 * frame flashes light blue once. Nothing moves the page, and it's gone the
 * moment there's a drawing in its place. Axis: placement, pointing at the
 * spot rather than describing it.
 */
export function CanvasHint() {
  return (
    <DrawScreen
      slots={({ active, attempt }) => ({
        canvasClassName: active ? "ring-highlight ring-2" : "",
        onCanvas: active ? (
          <div
            key={attempt}
            role="status"
            className="canvas-hint pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center"
          >
            <svg
              aria-hidden
              viewBox="0 0 160 40"
              className="text-primary w-2/3"
            >
              <path
                className="canvas-hint-squiggle"
                d="M6 28 C 22 4, 34 4, 42 22 S 62 38, 74 18 S 98 2, 108 22 S 132 36, 154 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={1}
              />
            </svg>
            <p
              className={`${hand.className} text-foreground text-2xl leading-tight font-bold`}
            >
              Draw something here first
            </p>
            <style>{`
              @keyframes canvas-hint-draw { from { stroke-dashoffset: 1; } }
              @keyframes canvas-hint-in {
                from { opacity: 0; translate: 0 6px; }
              }
              .canvas-hint-squiggle { stroke-dasharray: 1; }
              @media (prefers-reduced-motion: no-preference) {
                .canvas-hint-squiggle {
                  animation: canvas-hint-draw 700ms cubic-bezier(0.65, 0, 0.35, 1) both;
                }
                .canvas-hint p {
                  animation: canvas-hint-in 280ms cubic-bezier(0.23, 1, 0.32, 1) 250ms both;
                }
              }
            `}</style>
          </div>
        ) : null,
      })}
    />
  );
}
