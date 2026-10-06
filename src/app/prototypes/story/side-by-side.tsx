import { CARD_TITLE, NOTE } from "../../_home/type";
import { Frame, Letter, RepoLink, SKILLS, STORY, Skill } from "./shared";

/**
 * Side by side: the letter on the left and what was learned beside it as a
 * tall chapter card, so both are seen at once on a laptop: the why, and the
 * skills and tools it took, for someone learning to build software.
 */
export function SideBySide() {
  return (
    <Frame>
      <div className="grid items-stretch gap-8 lg:grid-cols-[1.25fr_1fr]">
        <Letter />
        <article className="border-foreground flex flex-col gap-5 rounded-xl border-2 bg-white p-6 shadow-[6px_6px_0_var(--primary)]">
          <div className="flex flex-col items-start gap-3">
            <p className={NOTE}>What I learned</p>
            <h3 className={CARD_TITLE}>
              For anyone learning to build software
            </h3>
            <p className="text-muted-foreground text-base">
              {STORY.learnedLead}
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {SKILLS.map((skill, index) => (
              <Skill key={skill.name} skill={skill} index={index} />
            ))}
          </ul>
          <div className="border-foreground/15 flex flex-col items-start gap-2 border-t-2 pt-4">
            <RepoLink />
            <p className="text-muted-foreground text-sm">
              And much more. The whole project is public, so you can read how
              each part works.
            </p>
          </div>
        </article>
      </div>
    </Frame>
  );
}
