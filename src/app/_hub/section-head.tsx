import type { ReactNode } from "react";
import { NOTE } from "../_home/type";

/**
 * A hub section's heading: the handwritten note over the title, and an
 * optional link on the right.
 */
export function SectionHead({
  id,
  note,
  title,
  action,
}: {
  /** The heading's id, for the section's `aria-labelledby`. */
  id: string;
  note: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col items-start gap-2">
        <p className={NOTE}>{note}</p>
        <h2
          id={id}
          className="text-2xl leading-tight font-black tracking-tight sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
