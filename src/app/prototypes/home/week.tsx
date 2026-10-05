"use client";

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

/** How long each beat stays up before the next, in ms. */
const BEAT_MS = 2800;

/**
 * The week played out on a phone, compact: the beats as a short list beside
 * it, stepping on by themselves every few seconds (only while it's on screen),
 * and a tap on a beat jumps to it. With reduced motion it doesn't step on
 * by itself; the beats are still there to tap.
 */
export function WeekStory() {
  const [beat, setBeat] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setBeat((current) => (current + 1) % BEATS.length),
      BEAT_MS,
    );
    return () => window.clearInterval(timer);
  }, [visible, beat]);

  return (
    <div
      ref={box}
      className="mx-auto grid w-full max-w-5xl items-center gap-6 px-5 py-6 md:grid-cols-2"
    >
      <div className="border-foreground bg-secondary mx-auto h-[340px] w-full max-w-[280px] overflow-hidden rounded-[2rem] border-4 px-4 shadow-[6px_6px_0_var(--primary)] md:h-[400px]">
        <p className="text-primary pt-3 text-center text-xs font-black tracking-wide">
          {BEATS[beat].day}
        </p>
        <Screen key={beat} beat={beat} />
      </div>
      <ol className="flex flex-col gap-1">
        {BEATS.map((item, index) => (
          <li key={item.day}>
            <button
              type="button"
              onClick={() => setBeat(index)}
              aria-current={beat === index ? "step" : undefined}
              className={`focus-visible:ring-highlight flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,opacity] duration-200 outline-none focus-visible:ring-3 ${beat === index ? "bg-white opacity-100 shadow-[0_2px_3px_rgb(15_27_45/0.08)]" : "opacity-50 hover:opacity-80"}`}
            >
              <span
                className={`${hand.className} text-primary w-24 shrink-0 pt-0.5 text-xl leading-tight font-bold`}
              >
                {item.day}
              </span>
              <span className="text-lg leading-snug font-black tracking-tight">
                {item.line}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
