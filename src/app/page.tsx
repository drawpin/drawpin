import type { Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PencilSimpleIcon,
  PushPinIcon,
  ShieldCheckIcon,
  SparkleIcon,
} from "@phosphor-icons/react/ssr";
import { createBoardQrCode } from "@/lib/board";
import { hand } from "@/lib/fonts";
import {
  HEADER_BUTTON,
  INKED_BUTTON,
  PAPER,
  YELLOW_STRIP,
} from "./b/[slug]/board-look";
import { PinnedDrawing } from "./b/[slug]/pinned-drawing";
import type { Tile } from "./b/[slug]/tiles";
import { JoinForm } from "./join/join-form";

/** The phone's status bar matches the blue hero, as on a board. */
export const viewport: Viewport = { themeColor: "#004aad" };

/**
 * Example drawings for the preview board: doodles made in Canva (UI pass,
 * 2026-10-05) to show what a board looks like until a real one is worth
 * showing. Names and captions are made up and labelled as an example.
 */
const EXAMPLE: Tile[] = [
  ["cat", "Maya#2041", "party cat"],
  ["rocket", "Priya#8983", "to the moon"],
  ["burger", "Theo#1997", "lunch, probably"],
  ["flower", "Sam#2683", null],
].map(([file, author, caption]) => ({
  id: `example-${file}`,
  author,
  caption,
  isGuest: false,
  isOwn: false,
  imageUrl: `/examples/${file}.webp`,
  createdAt: "",
}));

/** Who a board is for, as a quick list rather than a paragraph. */
const GROUPS = ["Cafés", "Classrooms", "Parties", "Offices", "Group chats"];

/** What starting one costs the person who starts it: nothing to run. */
const PROMISES = [
  { icon: SparkleIcon, text: "Free, no app" },
  { icon: ShieldCheckIcon, text: "Every drawing checked" },
  { icon: CheckCircleIcon, text: "Winners crowned for you" },
];

/** The gold trophy (Canva, like the podium's), on the example winner. */
function Trophy({ size }: { size: number }) {
  return (
    <Image
      src="/trophies/gold.webp"
      alt=""
      width={size}
      height={size}
      // Already a small WebP file (public/trophies).
      unoptimized
      className="absolute -right-3 -bottom-3 rotate-6 drop-shadow-[2px_2px_0_rgb(15_27_45/0.25)]"
    />
  );
}

/**
 * The home page (UI pass, polished 2026-10-05): show a board rather than
 * describe one. The hero carries one reason to join and an example board
 * beside it; how it works is three steps with a real piece of the product
 * each; the rest is short. The owner's own story stays word for word.
 */
export default async function Home() {
  const qr = await createBoardQrCode("https://drawpin.io");

  return (
    <div data-board className="flex flex-1 flex-col">
      <header className="bg-primary text-primary-foreground border-foreground overflow-hidden border-b-2">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pt-5 pb-14 sm:pb-20">
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

          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
            <section className="flex flex-col items-start gap-5">
              <p
                className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
              >
                No app. Free. Just draw.
              </p>
              <h1 className="text-4xl leading-[1.02] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
                A shared drawing board for wherever your people are
              </h1>
              <p className="max-w-md text-lg text-pretty text-white/85">
                Everyone draws one tile a day. Everyone votes. The best one wins
                the week.
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

            {/* An example board: the real polaroids, pinned and swinging
                in, with this week's leader holding the trophy. */}
            <section aria-label="An example board" className="relative">
              <p
                className={`${hand.className} absolute -top-7 right-0 rotate-3 text-xl font-bold text-white/80`}
              >
                an example board
              </p>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-10 pt-6">
                {EXAMPLE.map((tile, index) => (
                  <li
                    key={tile.id}
                    className="board-sway min-w-0"
                    style={
                      {
                        "--swing": `${index % 2 ? 7 : -7}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <PinnedDrawing
                      tile={tile}
                      index={index}
                      badge={index === 0 ? <Trophy size={44} /> : undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-5 py-14">
        <section className="flex flex-col gap-8">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>How it works</h2>
          {/* Three steps, each shown by the real thing rather than told. */}
          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            <li className="flex flex-col items-center gap-4 text-center">
              <div className="border-foreground w-36 rounded-xl border-2 bg-white p-3 shadow-[4px_4px_0_var(--primary)]">
                {/* Generated server-side by the qrcode library from our own
                    URL, so it contains no user-controlled markup. */}
                <div
                  role="img"
                  aria-label="A board's QR code"
                  dangerouslySetInnerHTML={{ __html: qr.svg }}
                />
              </div>
              <p className="text-lg font-black tracking-tight">
                Scan the board&apos;s code
              </p>
            </li>
            <li className="flex flex-col items-center gap-4 text-center">
              <div className="w-36 pt-6">
                <PinnedDrawing tile={EXAMPLE[1]} index={4} />
              </div>
              <p className="text-lg font-black tracking-tight">
                Draw one tile a day
              </p>
            </li>
            <li className="flex flex-col items-center gap-4 text-center">
              <div className="relative grid h-40 w-36 place-items-center">
                <Image
                  src="/trophies/gold.webp"
                  alt=""
                  width={104}
                  height={104}
                  // Already a small WebP file (public/trophies).
                  unoptimized
                />
                <span className="border-foreground bg-winner absolute right-0 bottom-3 rounded-full border-2 px-2.5 py-0.5 text-sm font-black">
                  4 votes
                </span>
              </div>
              <p className="text-lg font-black tracking-tight">
                Vote. The best wins the week
              </p>
            </li>
          </ol>
        </section>

        <section className="flex flex-col items-start gap-5">
          <h2 className="text-2xl font-black tracking-tight">
            Made for any group
          </h2>
          <ul className="flex flex-wrap gap-3">
            {GROUPS.map((group, index) => (
              <li
                key={group}
                className={`border-foreground rounded-full border-2 bg-white px-4 py-1.5 font-bold ${index % 2 ? "rotate-1" : "-rotate-1"}`}
              >
                {group}
              </li>
            ))}
          </ul>
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

        <section className="bg-primary text-primary-foreground border-foreground flex flex-col items-start gap-5 rounded-xl border-2 px-6 py-8 shadow-[5px_5px_0_var(--foreground)]">
          <h2 className="text-3xl font-black tracking-tight text-balance">
            Start a board in a minute
          </h2>
          <ul className="flex flex-col gap-2.5">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 font-semibold">
                <Icon weight="fill" className="text-winner size-5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
          <Link href="/login" className={INKED_BUTTON}>
            Start a board
            <ArrowRightIcon weight="bold" className="size-5" />
          </Link>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className={`${YELLOW_STRIP} text-3xl`}>Why I made this</h2>
          <div
            className={`text-muted-foreground flex max-w-2xl flex-col gap-3 rounded-lg p-6 text-[15px] leading-relaxed ${PAPER}`}
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
      </main>
    </div>
  );
}
