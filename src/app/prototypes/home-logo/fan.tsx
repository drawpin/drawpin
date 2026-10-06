import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { EXAMPLE, TrophyBadge } from "../../_home/shared";
import { Card, Logo, Pitch, RestOfPage } from "./shared";

/** Each drawing's place in the fan: a slant and a shift toward the middle. */
const FAN = [
  "-rotate-[9deg] translate-x-[14%] translate-y-[6%]",
  "z-10 -translate-y-[4%]",
  "rotate-[8deg] -translate-x-[14%] translate-y-[8%]",
];

/**
 * Fan: the logo on top of the poster's left column, and the drawings fanned
 * out together like a hand of cards, overlapping, so the right half is one
 * full picture instead of three scattered ones with gaps between.
 */
export function Fan() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Card>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pt-6 pb-8 md:grid-cols-[1.1fr_1fr] md:px-10 md:py-10">
          <div className="flex flex-col items-start gap-5">
            <Logo className="h-10 w-auto md:h-12" />
            <Pitch />
          </div>
          <ul className="mx-auto flex w-full max-w-lg items-center justify-center pt-4 md:pt-0">
            {EXAMPLE.slice(0, 3).map((tile, index) => (
              <li
                key={tile.id}
                className={`relative w-1/3 min-w-0 shrink-0 ${FAN[index]}`}
              >
                <PinnedDrawing
                  tile={tile}
                  index={index}
                  badge={index === 2 ? <TrophyBadge size={40} /> : undefined}
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
