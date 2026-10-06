import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { EXAMPLE, TrophyBadge } from "../../_home/shared";
import { Card, Logo, Pitch, RestOfPage } from "./shared";

/** The drawings, closer in than on the real page, filling the right half. */
const SPOTS = [
  "md:absolute md:top-[7%] md:right-[5%] md:w-40 md:rotate-2",
  "md:absolute md:top-[12%] md:right-[34%] md:w-40 md:-rotate-2",
  "md:absolute md:bottom-[6%] md:right-[19%] md:w-40 md:rotate-1",
];

/**
 * Masthead: the logo at the top of the poster, the way a magazine has its
 * name, with the headline under it. The drawings are bigger and pulled in,
 * and the card is only as tall as it needs to be.
 */
export function Masthead() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Card>
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 pt-5 pb-8 md:px-10 md:pt-6 md:pb-10">
          <div className="relative z-10">
            <Logo className="h-10 w-auto md:h-12" />
          </div>
          <Pitch />
          <ul className="grid grid-cols-3 gap-3 pt-4 md:contents">
            {EXAMPLE.slice(0, 3).map((tile, index) => (
              <li key={tile.id} className={`min-w-0 ${SPOTS[index]}`}>
                <PinnedDrawing
                  tile={tile}
                  index={index}
                  badge={index === 0 ? <TrophyBadge size={40} /> : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <RestOfPage />
    </div>
  );
}
