"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import { DrawScreen } from "./screen";

/**
 * On the button: the Post button answers itself. It shakes its head, turns
 * light and says what's missing; drawing anything turns it back. No extra
 * line on the screen, so nothing below the canvas shifts. Axis: interaction,
 * feedback on the control that was tapped.
 */
export function PostButton() {
  return (
    <DrawScreen
      slots={({ active, attempt }) => ({
        postClassName: active
          ? `nudge-shake-${attempt % 2} bg-secondary! text-primary! ring-primary ring-2 ring-inset`
          : "",
        postLabel: active ? (
          <span role="status" className="inline-flex items-center gap-2">
            <PencilSimpleIcon weight="bold" className="size-5" />
            Draw something first
            {/* Two identical shakes, swapped on each blank Post so the
                animation starts over every time. */}
            <style>{`
              @keyframes nudge-shake-0 {
                0%, 100% { translate: 0 0; }
                20% { translate: -7px 0; }
                40% { translate: 6px 0; }
                60% { translate: -4px 0; }
                80% { translate: 2px 0; }
              }
              @keyframes nudge-shake-1 {
                0%, 100% { translate: 0 0; }
                20% { translate: -7px 0; }
                40% { translate: 6px 0; }
                60% { translate: -4px 0; }
                80% { translate: 2px 0; }
              }
              @media (prefers-reduced-motion: no-preference) {
                .nudge-shake-0 { animation: nudge-shake-0 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97); }
                .nudge-shake-1 { animation: nudge-shake-1 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97); }
              }
            `}</style>
          </span>
        ) : undefined,
      })}
    />
  );
}
