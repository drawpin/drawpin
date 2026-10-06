import { CARD_TITLE, NOTE } from "../../_home/type";
import { Frame, Letter, RepoLink, SKILLS, STORY, Skill } from "./shared";

/**
 * Toolbox: the letter first, then what was learned as its own chapter card
 * across the full width, written for someone learning to build software:
 * every skill as a tile with the tools behind it, and the code to read.
 */
export function Toolbox() {
  return (
    <Frame>
      <Letter />
      <article className="border-foreground flex flex-col gap-6 rounded-xl border-2 bg-white p-6 shadow-[6px_6px_0_var(--primary)] md:p-8">
        <div className="flex flex-col items-start gap-3">
          <p className={NOTE}>What I learned</p>
          <h3 className={CARD_TITLE}>
            Learning to build software? Here&apos;s everything this one covers.
          </h3>
          <p className="text-muted-foreground max-w-3xl text-lg">
            {STORY.learnedLead}
          </p>
        </div>
        <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((skill, index) => (
            <Skill key={skill.name} skill={skill} index={index} />
          ))}
        </ul>
        <div className="border-foreground/15 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 pt-5">
          <RepoLink />
          <p className="text-muted-foreground text-sm">
            And much more. The whole project is public, so you can read how each
            part works.
          </p>
        </div>
      </article>
    </Frame>
  );
}
