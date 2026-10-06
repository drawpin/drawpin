import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { EXAMPLE, TrophyBadge } from "../../_home/shared";
import { Card, Logo, Pitch, RestOfPage } from "./shared";

/**
 * Stamp: the logo signs the poster, big and at a slant in its bottom-right
 * corner, under a row of the drawings across the top right. Two columns, so
 * the right half is used top to bottom.
 */
export function Stamp() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Card>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pt-8 pb-8 md:grid-cols-[1.1fr_1fr] md:px-10 md:py-10">
          <div className="flex flex-col gap-5">
            <Pitch />
          </div>
          <div className="flex flex-col items-center gap-6 md:items-end">
            <ul className="grid w-full max-w-md grid-cols-3 gap-3">
              {EXAMPLE.slice(0, 3).map((tile, index) => (
                <li
                  key={tile.id}
                  className={`min-w-0 ${["rotate-2", "-rotate-2 md:translate-y-5", "rotate-1"][index]}`}
                >
                  <PinnedDrawing
                    tile={tile}
                    index={index}
                    badge={index === 0 ? <TrophyBadge size={36} /> : undefined}
                  />
                </li>
              ))}
            </ul>
            <div className="-rotate-3 md:pt-4">
              <Logo className="h-16 w-auto md:h-24" />
            </div>
          </div>
        </div>
      </Card>
      <RestOfPage />
    </div>
  );
}
