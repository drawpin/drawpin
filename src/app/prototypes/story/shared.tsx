"use client";

import {
  CubeIcon,
  DatabaseIcon,
  EyeIcon,
  GitBranchIcon,
  GithubLogoIcon,
  KeyIcon,
  LightningIcon,
  PaletteIcon,
  ShieldCheckIcon,
  TestTubeIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { Feedback } from "../../_home/feedback";
import { OUTLINE_BUTTON, SECTION_TITLE } from "../../_home/type";

/** The story's words, as on the real page. */
export const STORY = {
  gap: "I love it when software makes a difference in people's everyday lives. There seems to be a gap between software that makes work better and software that gives everyone something fun to do every day.",
  idea: "DrawPin is my attempt to point what I know about building software in that direction. Draw a tile every day with your friend group, at work or at your favorite local spot. It goes up next to everyone else's, and at the end of the week the competition begins. That was the idea, anyway.",
  learnedLead:
    "It turned out there was a lot for me to learn as an aspiring software engineer, too. I wanted this one idea to cover every part of building software I felt unsure about.",
  learnedTail:
    "It became a chance to bring groups of people a good time, and to give myself a better learning experience than I ever expected.",
  signOff: "So have fun, and get drawing :)",
};

/** Each skill from the story, with what DrawPin actually uses for it. */
export const SKILLS: { name: string; tools: string; icon: Icon }[] = [
  {
    name: "UI/UX design",
    tools: "Next.js, Tailwind CSS, shadcn/ui, prototyping",
    icon: PaletteIcon,
  },
  {
    name: "Security & bot protection",
    tools: "Cloudflare Turnstile, signed device cookies, hashed IPs",
    icon: ShieldCheckIcon,
  },
  {
    name: "Computer vision & moderation",
    tools: "NSFWJS, OpenAI moderation, a custom blocklist",
    icon: EyeIcon,
  },
  {
    name: "Database design",
    tools: "Postgres on Supabase, row-level security, migrations",
    icon: DatabaseIcon,
  },
  {
    name: "Sign-in",
    tools: "Google sign-in and email links with Supabase Auth",
    icon: KeyIcon,
  },
  {
    name: "Live updates",
    tools: "Supabase Realtime, so new tiles appear as they're posted",
    icon: LightningIcon,
  },
  {
    name: "Automated testing",
    tools: "700+ Vitest unit tests, Playwright end to end",
    icon: TestTubeIcon,
  },
  {
    name: "Docker",
    tools: "The whole database stack running locally",
    icon: CubeIcon,
  },
  {
    name: "CI/CD",
    tools: "GitHub Actions, Vercel previews, trunk-based releases",
    icon: GitBranchIcon,
  },
];

/** The public repository, for anyone who wants to read how it's built. */
export const REPO_URL = "https://github.com/drawpin/drawpin";

/** Faint ruled lines, like a notepad page, sitting just under each line. */
const RULED =
  "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_2rem)] bg-[position:0_20px]";

/**
 * The story's opening as a letter pinned to the page: ruled paper, a margin
 * line, a handwritten greeting and sign-off around the owner's words.
 */
export function Letter({ className = "" }: { className?: string }) {
  return (
    <article
      className={`pinned pin-pop border-foreground relative -rotate-[0.6deg] rounded-sm border-2 bg-white shadow-[6px_6px_0_var(--foreground)] ${className}`}
      style={pinStyle("#ff821b", 150)}
    >
      <div
        className={`${RULED} relative h-full px-6 pt-8 pb-8 text-lg leading-8 md:pr-10 md:pl-20`}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-12 hidden w-0.5 bg-[#ff821b]/50 md:block"
        />
        <p
          className={`${hand.className} text-primary text-3xl leading-8 font-bold`}
        >
          Hi there,
        </p>
        <div className="text-foreground/85 flex flex-col gap-8">
          <p>{STORY.gap}</p>
          <p>{STORY.idea}</p>
          <p>{STORY.learnedTail}</p>
        </div>
        <p
          className={`${hand.className} text-primary mt-8 text-4xl leading-8 font-bold`}
        >
          {STORY.signOff}
        </p>
      </div>
    </article>
  );
}

/** One skill: its icon in a coloured circle, its name, and the tools. */
export function Skill({
  skill,
  index,
}: {
  skill: (typeof SKILLS)[number];
  index: number;
}) {
  const SkillIcon = skill.icon;
  const tint = ["bg-winner", "bg-highlight", "bg-[#ff821b]"][index % 3];
  return (
    <li className="flex items-start gap-3">
      <span
        className={`border-foreground grid size-10 shrink-0 place-items-center rounded-full border-2 ${tint}`}
      >
        <SkillIcon weight="bold" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-base leading-tight font-black">{skill.name}</span>
        <span className="text-muted-foreground text-sm leading-snug">
          {skill.tools}
        </span>
      </div>
    </li>
  );
}

/** The link to the public code. */
export function RepoLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={OUTLINE_BUTTON}
    >
      <GithubLogoIcon weight="bold" className="size-5" />
      See the code on GitHub
    </a>
  );
}

/**
 * The page around a variant: the story's heading, the variant, then the
 * feedback section that follows it on the real page.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pt-10">
        <h2 className={SECTION_TITLE}>Why I made this</h2>
        {children}
      </section>
      <Feedback />
    </div>
  );
}
