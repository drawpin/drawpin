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
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { NOTE, OUTLINE_BUTTON, SECTION_TITLE } from "./type";

/** Each skill the owner set out to learn, with what DrawPin uses for it. */
const SKILLS: { name: string; tools: string; icon: Icon }[] = [
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
const REPO_URL = "https://github.com/drawpin/drawpin";

/** The icon circles take the palette's three accents in turn. */
const TINTS = ["bg-winner", "bg-highlight", "bg-attention"];

/**
 * Faint ruled lines, like a notepad page, each sitting just under a line of
 * text (2rem apart, matching `leading-8`).
 */
const RULED =
  "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_2rem)] bg-[position:0_20px]";

/**
 * "Why I made this" (UI pass, chosen from prototypes on 2026-10-05,
 * "Toolbox", as one card): the owner's story as a letter pinned to the page,
 * running straight into what building DrawPin taught them, set out for
 * anyone learning to build software: each skill with the tools behind it,
 * and the public code to read. The story's words are the owner's.
 */
export function Story() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className={SECTION_TITLE}>Why I made this</h2>
      <article
        className="pinned pin-pop border-foreground relative rounded-sm border-2 bg-white shadow-[6px_6px_0_var(--foreground)]"
        style={pinStyle("#ff821b", 150)}
      >
        <span
          aria-hidden
          className="bg-attention/50 absolute inset-y-0 left-12 hidden w-0.5 md:block"
        />
        <div
          className={`${RULED} text-foreground/85 flex flex-col gap-8 px-6 pt-8 pb-8 text-lg leading-8 md:pr-10 md:pl-20`}
        >
          <p
            className={`${hand.className} text-primary -mb-8 text-3xl leading-8 font-bold`}
          >
            Hi there,
          </p>
          <p>
            I love it when software makes a difference in people&apos;s everyday
            lives. There seems to be a gap between software that makes work
            better and software that gives everyone something fun to do every
            day.
          </p>
          <p>
            DrawPin is my attempt to point what I know about building software
            in that direction. Draw a tile every day with your friend group, at
            work or at your favorite local spot. It goes up next to everyone
            else&apos;s, and at the end of the week the competition begins. That
            was the idea, anyway.
          </p>
          <p>
            It turned out there was a lot for me to learn as an aspiring
            software engineer, too. I wanted this one idea to cover every part
            of building software I felt unsure about:
          </p>
        </div>

        <div className="border-foreground/15 relative flex flex-col gap-5 border-y-2 border-dashed bg-white px-6 py-6 md:pr-10 md:pl-20">
          <p className={NOTE}>What I learned</p>
          <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map(({ name, tools, icon: SkillIcon }, index) => (
              <li key={name} className="flex items-start gap-3">
                <span
                  className={`border-foreground grid size-10 shrink-0 place-items-center rounded-full border-2 ${TINTS[index % 3]}`}
                >
                  <SkillIcon weight="bold" className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-base leading-tight font-black">
                    {name}
                  </span>
                  <span className="text-muted-foreground text-sm leading-snug">
                    {tools}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`${RULED} text-foreground/85 flex flex-col gap-8 px-6 pt-8 pb-8 text-lg leading-8 md:pr-10 md:pl-20`}
        >
          <p>
            And much more. It became a chance to bring groups of people a good
            time, and to give myself a better learning experience than I ever
            expected.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <p
              className={`${hand.className} text-primary text-4xl leading-8 font-bold`}
            >
              So have fun, and get drawing :)
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={OUTLINE_BUTTON}
            >
              <GithubLogoIcon weight="bold" className="size-5" />
              See the code on GitHub
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
