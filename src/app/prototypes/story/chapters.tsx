import {
  GraduationCapIcon,
  LightbulbIcon,
  PencilSimpleIcon,
  type Icon,
} from "@phosphor-icons/react";
import { NOTE } from "../../_home/type";
import { Frame, LEARNED, STORY } from "./shared";

/** One chapter: a note, an icon, and what it says. */
function Chapter({
  note,
  icon: ChapterIcon,
  tint,
  shadow,
  children,
}: {
  note: string;
  icon: Icon;
  tint: string;
  shadow: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`border-foreground flex flex-col gap-4 rounded-xl border-2 bg-white p-6 ${shadow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={NOTE}>{note}</p>
        <span
          className={`border-foreground grid size-11 shrink-0 place-items-center rounded-full border-2 ${tint}`}
        >
          <ChapterIcon weight="bold" className="size-5" />
        </span>
      </div>
      <div className="text-muted-foreground flex flex-col gap-3 text-base leading-relaxed">
        {children}
      </div>
    </article>
  );
}

/**
 * Chapters: the story in three cards, read left to right, each in the same
 * inked style as the cards above it. The gap, the idea, and what was
 * learned, with the learning set out as a list. The sign-off sits under them.
 */
export function Chapters() {
  return (
    <Frame>
      <div className="grid gap-5 md:grid-cols-3">
        <Chapter
          note="The gap"
          icon={LightbulbIcon}
          tint="bg-winner"
          shadow="shadow-[5px_5px_0_var(--foreground)]"
        >
          <p>{STORY.gap}</p>
        </Chapter>
        <Chapter
          note="The idea"
          icon={PencilSimpleIcon}
          tint="bg-highlight"
          shadow="shadow-[5px_5px_0_var(--primary)]"
        >
          <p>{STORY.idea}</p>
        </Chapter>
        <Chapter
          note="What I learned"
          icon={GraduationCapIcon}
          tint="bg-[#ff821b]"
          shadow="shadow-[5px_5px_0_var(--foreground)]"
        >
          <p>{STORY.learnedLead}</p>
          <ul className="text-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-sm font-bold">
            {LEARNED.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span aria-hidden className="text-primary">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p>{STORY.learnedTail}</p>
        </Chapter>
      </div>
      <p className="text-foreground text-center text-xl font-black md:text-2xl">
        {STORY.signOff}
      </p>
    </Frame>
  );
}
