"use client";

import type { ReactNode } from "react";
import { Feedback } from "../../_home/feedback";
import { SECTION_TITLE } from "../../_home/type";

/** What the owner learned, as listed in the story. */
export const LEARNED = [
  "UI/UX design",
  "Security & bot protection",
  "Computer vision & moderation",
  "Database design",
  "Sign-in",
  "Live updates",
  "Automated testing",
  "Docker",
  "CI/CD",
];

/** The story's paragraphs, word for word as on the real page. */
export const STORY = {
  gap: "I love it when software makes a difference in people's everyday lives. There seems to be a gap between software that makes work better and software that gives everyone something fun to do every day.",
  idea: "DrawPin is my attempt to point what I know about building software in that direction. Draw a tile every day with your friend group, at work or at your favorite local spot. It goes up next to everyone else's, and at the end of the week the competition begins. That was the idea, anyway.",
  learnedLead:
    "It turned out there was a lot for me to learn as an aspiring software engineer, too. I wanted this one idea to cover every part of building software I felt unsure about:",
  learnedTail:
    "It became a chance to bring groups of people a good time, and to give myself a better learning experience than I ever expected.",
  signOff: "So have fun, and get drawing :)",
};

/** The learned list as one sentence, as the real page has it. */
export const LEARNED_SENTENCE =
  "UI/UX design, security and bot protection, computer vision and content moderation, database design, sign-in, live updates, automated testing, Docker, continuous integration and deployment, and much more.";

/**
 * The page around a variant: the end of the home page, the story's heading,
 * the variant, then the feedback section that follows it on the real page.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 pt-10">
        <h2 className={SECTION_TITLE}>Why I made this</h2>
        {children}
      </section>
      <Feedback />
    </div>
  );
}
