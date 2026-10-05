"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hand } from "@/lib/fonts";
import { HEADER_BUTTON, INKED_BUTTON } from "../../b/[slug]/board-look";
import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import { EXAMPLE, Ending, Nav, TrophyBadge } from "./shared";

/** The week, in four beats: what's said, and what the phone shows. */
const BEATS = [
  { day: "Monday", line: "Someone scans the code and draws one tile." },
  { day: "All week", line: "The board fills up as people draw." },
  { day: "Next week", line: "Everyone votes on last week's board." },
  { day: "Sunday night", line: "The winner gets the trophy, for good." },
] as const;

/** What the phone shows at each beat, built from the real board pieces. */
function Screen({ beat }: { beat: number }) {
  if (beat === 0) {
    return (
      <div className="motion-safe:animate-fade-up flex flex-col items-center gap-3 pt-6">
        <div className="w-40">
          <PinnedDrawing tile={EXAMPLE[1]} index={0} />
        </div>
        <span className="bg-winner border-foreground rounded-full border-2 px-3 py-1 text-sm font-black">
          Posted!
        </span>
      </div>
    );
  }
  if (beat === 1) {
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 pt-5">
        {EXAMPLE.map((tile, index) => (
          <li
            key={tile.id}
            className="motion-safe:animate-drop-in"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <PinnedDrawing tile={tile} index={index} />
          </li>
        ))}
      </ul>
    );
  }
  if (beat === 2) {
    return (
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 pt-5">
        {EXAMPLE.map((tile, index) => (
          <li key={tile.id} className="relative">
            <PinnedDrawing tile={tile} index={index} picked={index === 0} />
            <span
              className="motion-safe:animate-fade-up border-foreground bg-winner absolute -top-2 -right-1 z-20 rounded-full border-2 px-2 text-xs font-black"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {[4, 2, 3, 1][index]}{" "}
              {[4, 2, 3, 1][index] === 1 ? "vote" : "votes"}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="motion-safe:animate-fade-up flex flex-col items-center gap-4 pt-6">
      <div className="w-44">
        <PinnedDrawing
          tile={EXAMPLE[0]}
          index={0}
          badge={<TrophyBadge size={56} />}
        />
      </div>
      <p className={`${hand.className} text-primary text-2xl font-bold`}>
        Into the Hall of Fame
      </p>
    </div>
  );
}

/**
 * A week: scroll through one board's week. A phone stays put and plays it
 * out, from the first drawing to the winner's trophy, one short line per
 * beat. Axis: storytelling, the loop shown in order.
 */
export function Week() {
  return (
    <div data-board className="flex min-h-dvh flex-col">
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        <Nav />
        <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-5 pt-6 pb-14">
          <h1 className="max-w-3xl text-5xl leading-[1] font-black tracking-tight text-balance sm:text-6xl">
            A drawing board your whole room shares.
          </h1>
          <p className="text-lg text-white/85">Here&apos;s one week of it.</p>
          <div className="flex flex-wrap gap-3">
            <a href="#join" className={INKED_BUTTON}>
              I have a code
            </a>
            <Link href="/login" className={HEADER_BUTTON}>
              Start a board
            </Link>
          </div>
        </section>
      </header>

      <WeekStory />
      <Ending />
    </div>
  );
}

/** The week played out on a phone as the beats scroll by. */
export function WeekStory() {
  const [beat, setBeat] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  // Whichever beat is in the middle of the screen is the one shown.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setBeat(Number((entry.target as HTMLElement).dataset.beat));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const step of steps.current) if (step) observer.observe(step);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-14 md:grid-cols-2">
      {/* The phone: sticky beside the beats on a wide screen, and on a
            phone, stuck to the top while the beats scroll under it. */}
      <div className="sticky top-3 z-10 self-start">
        <div className="border-foreground bg-secondary mx-auto h-[380px] w-full max-w-[300px] overflow-hidden rounded-[2rem] border-4 px-4 shadow-[6px_6px_0_var(--primary)] md:h-[480px]">
          <p className="text-primary pt-3 text-center text-xs font-black tracking-wide">
            {BEATS[beat].day}
          </p>
          <Screen key={beat} beat={beat} />
        </div>
      </div>
      <ol className="flex flex-col">
        {BEATS.map((item, index) => (
          <li
            key={item.day}
            ref={(element) => {
              steps.current[index] = element;
            }}
            data-beat={index}
            className={`flex min-h-[60dvh] flex-col justify-center gap-2 transition-opacity duration-300 ${beat === index ? "opacity-100" : "opacity-35"}`}
          >
            <p className={`${hand.className} text-primary text-3xl font-bold`}>
              {item.day}
            </p>
            <p className="text-3xl leading-tight font-black tracking-tight text-balance">
              {item.line}
            </p>
            {index === BEATS.length - 1 && (
              <Image
                src="/trophies/gold.webp"
                alt=""
                width={56}
                height={56}
                unoptimized
                className="mt-2"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
