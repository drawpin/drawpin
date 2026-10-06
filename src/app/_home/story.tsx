"use client";

import {
  CubeIcon,
  DatabaseIcon,
  EyeIcon,
  GitBranchIcon,
  KeyIcon,
  LightningIcon,
  PaletteIcon,
  ShieldCheckIcon,
  TestTubeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { OUTLINE_BUTTON, SECTION_TITLE } from "./type";

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

/** The icon circles take the palette's three accents in turn. */
const TINTS = ["bg-winner", "bg-highlight", "bg-attention"];

const BODY = "text-foreground/85 text-lg leading-8";

/** The skills, each with its icon and the tools behind it. */
function Skills() {
  return (
    <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {SKILLS.map(({ name, tools, icon: SkillIcon }, index) => (
        <li key={name} className="flex items-start gap-3">
          <span
            className={`border-foreground grid size-10 shrink-0 place-items-center rounded-full border-2 ${TINTS[index % 3]}`}
          >
            <SkillIcon weight="bold" className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-base leading-tight font-black">{name}</span>
            <span className="text-muted-foreground text-sm leading-snug">
              {tools}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The letter's pages, in order: a tab label and what the page says. */
const PAGES: { tab: string; body: ReactNode }[] = [
  {
    tab: "The story",
    body: (
      <div className={`flex flex-col gap-3 ${BODY}`}>
        <p
          className={`${hand.className} text-primary text-3xl leading-8 font-bold`}
        >
          Hi there,
        </p>
        <p>
          I love it when software makes a difference in people&apos;s everyday
          lives. There seems to be a gap between software that makes work better
          and software that gives everyone something fun to do every day.
        </p>
        <p>
          DrawPin is my attempt to point what I know about building software in
          that direction. Draw a tile every day with your friend group, at work
          or at your favorite local spot. It goes up next to everyone
          else&apos;s, and at the end of the week the competition begins. That
          was the idea, anyway.
        </p>
        <p>
          It became a chance to bring groups of people a good time, and to give
          myself a better learning experience than I ever expected.
        </p>
        <p
          className={`${hand.className} text-primary pt-2 text-4xl leading-tight font-bold`}
        >
          So have fun, and get drawing :)
        </p>
        <p
          className={`${hand.className} text-foreground text-3xl leading-tight font-bold`}
        >
          - Ahmad
        </p>
      </div>
    ),
  },
  {
    tab: "What I learned",
    body: (
      <div className="flex flex-col gap-5">
        <p className={BODY}>
          It turned out there was a lot for me to learn as an aspiring software
          engineer, too. I wanted this one idea to cover every part of building
          software I felt unsure about:
        </p>
        <Skills />
        <p className="text-muted-foreground text-base font-semibold">
          And much more.
        </p>
      </div>
    ),
  },
];

/**
 * "Why I made this" (UI pass, 2026-10-05): the owner's story as a letter
 * pinned to the page, read a page at a time instead of as one long card.
 * Two pages: the story itself, signed by the owner, and what building it
 * taught them, set out for anyone learning to build software (each skill
 * with the tools behind it). Tabs and Back and Next turn the pages; each
 * slides in from the side it comes from. Both pages share one grid cell, so
 * the letter is as tall as its longer page and never jumps. With reduced
 * motion the pages just swap. The story's words are the owner's.
 */
export function Story() {
  const [page, setPage] = useState(0);
  const last = PAGES.length - 1;

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
        <div className="flex flex-col gap-6 px-6 pt-8 pb-6 md:pr-10 md:pl-20">
          <div
            role="tablist"
            aria-label="Pages"
            className="flex flex-wrap gap-2"
          >
            {PAGES.map(({ tab }, index) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`story-tab-${index}`}
                aria-selected={page === index}
                aria-controls={`story-page-${index}`}
                onClick={() => setPage(index)}
                className={`${hand.className} focus-visible:ring-highlight rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold transition-colors duration-150 ease-out outline-none focus-visible:ring-3 ${page === index ? "bg-winner text-foreground -rotate-2" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid">
            {PAGES.map(({ tab, body }, index) => {
              const shown = index === page;
              // A page not showing waits off to the side it would come from.
              const offset = shown ? 0 : index < page ? -32 : 32;
              return (
                <div
                  key={tab}
                  id={`story-page-${index}`}
                  role="tabpanel"
                  aria-labelledby={`story-tab-${index}`}
                  inert={!shown}
                  className="col-start-1 row-start-1 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                  style={{
                    opacity: shown ? 1 : 0,
                    translate: `${offset}px 0`,
                    transitionDelay: shown ? "60ms" : "0ms",
                  }}
                >
                  {body}
                </div>
              );
            })}
          </div>

          <div className="border-foreground/15 flex items-center justify-between gap-3 border-t-2 border-dashed pt-4">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className={`${OUTLINE_BUTTON} disabled:invisible`}
            >
              <ArrowLeftIcon weight="bold" className="size-5" />
              Back
            </button>
            <div className="flex gap-1.5" aria-hidden>
              {PAGES.map(({ tab }, index) => (
                <span
                  key={tab}
                  className={`h-2 rounded-full transition-[width,background-color] duration-300 ease-out ${page === index ? "bg-primary w-6" : "bg-foreground/20 w-2"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPage(page === last ? 0 : page + 1)}
              className={OUTLINE_BUTTON}
            >
              {page === last ? "Read again" : "Next"}
              {page !== last && (
                <ArrowRightIcon weight="bold" className="size-5" />
              )}
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
