import { Children, type ReactNode } from "react";
import { YELLOW_STRIP } from "../board-look";

/** The yellow strip over last week's drawings. */
export function DrawingsHeading() {
  return (
    <h2 className={`${YELLOW_STRIP} text-3xl`}>Last week&apos;s drawings</h2>
  );
}

/**
 * Two columns of pinned drawings, with room above each for its pin. Each
 * swings into place on its pin as it scrolls in, alternating sides, as on
 * the board (`board-sway`, globals.css).
 */
export function DrawingsList({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
      {Children.map(children, (child, index) => (
        <li
          className="board-sway min-w-0"
          style={
            { "--swing": `${index % 2 ? 7 : -7}deg` } as React.CSSProperties
          }
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
