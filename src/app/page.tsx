import type { Viewport } from "next";
import Link from "next/link";
import { PencilSimpleIcon, PushPinIcon } from "@phosphor-icons/react/ssr";
import { hand } from "@/lib/fonts";
import {
  HEADER_BUTTON,
  INKED_BUTTON,
  PAPER,
  YELLOW_STRIP,
} from "./b/[slug]/board-look";
import { JoinForm } from "./join/join-form";

/** The phone's status bar matches the blue hero, as on a board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/** How a tile gets from a code on a wall to a Hall of Fame, in order. */
const STEPS = [
  {
    title: "Scan, or type the code",
    body: "The QR opens that board. No app, and nothing to install. If you can't scan it, whoever set the board up has today's 8-digit code.",
  },
  {
    title: "Draw one tile",
    body: "A few colours, a few brushes, and a caption if you want one. One drawing each per day, so the board stays everyone's rather than one person's.",
  },
  {
    title: "Come back and vote",
    body: "Next week you pick three from the week before. The most-voted drawing wins the week and stays in that board's Hall of Fame; each month, the best of those winners meet again.",
  },
];

/** A slight, steady lean for each step's card, like notes on a table. */
const LEANS = ["-rotate-1", "rotate-1", "-rotate-[0.5deg]"];

/**
 * The home page, in the boards' own look (UI pass, 2026-10-05): a blue hero
 * like a board's header, the steps on paper, the code in an inked card, and
 * the tint behind it all. No drawings are made up for it: a real board's
 * belong here once there's one worth showing.
 */
export default function Home() {
  return (
    <div data-board className="flex flex-1 flex-col">
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 pt-5 pb-12 sm:pb-16">
          <nav className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-lg font-black tracking-tight">
              <PushPinIcon weight="fill" className="text-winner size-5" />
              DrawPin
            </span>
            {/* People draw and vote from the board itself; this door is for
                whoever is setting one up. */}
            <Link href="/login" className={`${HEADER_BUTTON} h-10`}>
              Start a board
            </Link>
          </nav>

          <section className="flex flex-col items-start gap-5">
            <p
              className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
            >
              No app. Free. Just draw.
            </p>
            <h1 className="max-w-2xl text-4xl leading-[1.02] font-black tracking-tight text-balance sm:text-6xl">
              A shared drawing board for wherever your people are
            </h1>
            {/* The mechanics belong to How it works, right underneath. Saying
                them twice makes the first telling read like fine print. */}
            <p className="max-w-xl text-lg text-pretty text-white/85">
              Create a board, put your code out for everyone to see, and let the
              competition speak for itself. A restaurant, a classroom, a group
              chat — you decide.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#join" className={`draw-awake ${INKED_BUTTON}`}>
                <PencilSimpleIcon weight="bold" className="size-5" />I have a
                code
              </a>
              <Link href="/login" className={HEADER_BUTTON}>
                Start a board
              </Link>
            </div>
          </section>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-16 px-5 py-12">
        <section className="flex flex-col gap-6">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>How it works</h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={`flex flex-col gap-2 rounded-lg p-5 ${PAPER} ${LEANS[index]}`}
              >
                <span
                  className={`${hand.className} text-primary text-3xl leading-none font-bold`}
                >
                  {index + 1}.
                </span>
                <h3 className="font-black tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="join"
          className="border-foreground flex scroll-mt-6 flex-col items-center gap-5 rounded-xl border-2 bg-white px-5 py-8 shadow-[5px_5px_0_var(--primary)]"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-black tracking-tight">Open a board</h2>
            <p className="text-muted-foreground text-sm">
              Type the 8-digit code. It changes every morning.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <JoinForm />
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Why I made this</h2>
          <div
            className={`text-muted-foreground flex flex-col gap-3 rounded-lg p-6 text-[15px] leading-relaxed ${PAPER}`}
          >
            <p>
              Whether you&apos;re waiting for your food or sitting with a group
              of friends, there&apos;s a gap — long enough to be bored, too
              short to start anything. Everyone fills it the same way, looking
              down at a phone on their own.
            </p>
            <p>
              DrawPin is an attempt to point that at the room instead. You draw
              one small thing, it goes up next to what everyone else drew today,
              and at the end of the week the room decides which one it liked.
            </p>
            <p>
              That was the idea, anyway. It turns out a room doesn&apos;t have
              to be a café — a classroom, a party, an office, a group chat with
              nothing going on. Nothing to install, nothing to sign up for, and
              it costs nothing to run.
            </p>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start gap-4 rounded-xl border-2 px-6 py-7 shadow-[5px_5px_0_var(--foreground)]">
          <h2 className="text-2xl font-black tracking-tight">
            Thinking of starting one?
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/85">
            Put up one QR code and the board looks after itself. Every drawing
            is checked before it appears, the week rolls over on its own, and a
            winner is crowned without you touching anything.
          </p>
          <Link href="/login" className={INKED_BUTTON}>
            Start a board — free
          </Link>
        </section>
      </main>
    </div>
  );
}
