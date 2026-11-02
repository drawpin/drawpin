import type { CSSProperties } from "react";
import Image from "next/image";
import { CrownSimpleIcon } from "@phosphor-icons/react/ssr";
import { pinColorFor, pinStyle } from "@/components/pin";
import { TrophyBadge } from "@/components/trophy-badge";
import type { Trophy } from "@/lib/profile";
import { PAPER } from "../b/[slug]/board-look";
import { SectionHead } from "./section-head";

const LEANS = [-2, 1.5, -1, 2];

/**
 * The shelf: each winning drawing stands pinned on one inked plank, scrolling
 * sideways on a phone. Winners are kept forever, so this is where they live.
 */
export function TrophiesSection({ trophies }: { trophies: Trophy[] }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHead note="Kept forever" title="Your trophies" />
      {trophies.length === 0 ? (
        <p className="border-foreground text-muted-foreground rounded-xl border-2 border-dashed px-4 py-8 text-center">
          No trophies yet. Win a week on any board and it&apos;s kept here
          forever.
        </p>
      ) : (
        <div className="-mx-5 [scrollbar-width:none] overflow-x-auto px-5 pt-5 pb-2">
          <ul className="border-foreground relative flex w-max gap-8 border-b-[6px] px-4 shadow-[0_6px_0_var(--primary)]">
            {trophies.map((trophy, index) => (
              <li
                key={trophy.id}
                className="relative flex w-40 flex-col items-center gap-2 pb-3"
              >
                <span
                  className={`pinned relative block w-full p-1.5 ${PAPER}`}
                  style={
                    {
                      ...pinStyle(pinColorFor(trophy.id)),
                      rotate: `${LEANS[index % LEANS.length]}deg`,
                    } as CSSProperties
                  }
                >
                  <Image
                    src={trophy.imageUrl}
                    alt={`Your winning drawing on ${trophy.boardName}`}
                    width={160}
                    height={160}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  <TrophyBadge size={40} />
                </span>
                <span className="flex flex-col items-center text-center">
                  <span className="flex items-center gap-1 text-sm leading-tight font-bold">
                    {trophy.kind === "super" && (
                      <CrownSimpleIcon
                        weight="fill"
                        className="text-attention size-4"
                      />
                    )}
                    {trophy.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {trophy.boardName}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
