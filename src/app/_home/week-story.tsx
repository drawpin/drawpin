"use client";

import { useEffect, useRef, useState } from "react";
import { hand } from "@/lib/fonts";
import { PinnedDrawing } from "../b/[slug]/pinned-drawing";
import { EXAMPLE, TrophyBadge } from "./shared";

/** The week, in four beats: what's said, and what the phone shows. */
const BEATS = [
  { day: "Any day", line: "Someone scans the code and draws one tile." },
  { day: "All week", line: "The board fills up as people draw." },
  { day: "Next week", line: "Everyone votes on last week's board." },
  { day: "Week’s end", line: "The winner gets the trophy, for good." },
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
      <div className="w-40">
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

/** How far apart the line's wiggles are, and how wide its loop is, in px. */
const WIGGLE = 34;
const CENTRE = 28;

/**
 * A wobbly pen line running `height` px down, with one loop curled at `loopY`:
 * a gentle wave there and back across the centre, the loop drawn clockwise.
 */
function penPath(height: number, loopY: number): string {
  const end = height - 6;
  const wave = (index: number) =>
    CENTRE + (index % 2 ? 1 : -1) * (5 + ((index * 37) % 4));
  let path = `M ${CENTRE} 4`;
  let y = 4;
  let index = 0;
  let looped = false;
  while (y < end) {
    const into = loopY - 16;
    if (!looped && y + WIGGLE >= into) {
      if (into > y) {
        path += ` Q ${wave(index++)} ${(y + into) / 2} ${CENTRE} ${into}`;
      }
      path +=
        ` C ${CENTRE + 26} ${loopY - 14}, ${CENTRE + 24} ${loopY + 16}, ${CENTRE + 2} ${loopY + 14}` +
        ` C ${CENTRE - 20} ${loopY + 12}, ${CENTRE - 16} ${loopY - 14}, ${CENTRE + 6} ${loopY - 6}` +
        ` C ${CENTRE + 18} ${loopY - 2}, ${CENTRE + 8} ${loopY + 12}, ${CENTRE} ${loopY + 22}`;
      y = loopY + 22;
      looped = true;
      continue;
    }
    const next = Math.min(y + WIGGLE, end);
    path += ` Q ${wave(index++)} ${(y + next) / 2} ${CENTRE} ${next}`;
    y = next;
  }
  return path;
}

/**
 * The pen line beside the beats, on wider screens: doodled down again each
 * time the story moves on, curling into a loop beside the beat that's up.
 * `list` is the beats' list, its rows measured for where the loop goes.
 */
function PenLine({
  beat,
  list,
}: {
  beat: number;
  list: React.RefObject<HTMLOListElement | null>;
}) {
  const [size, setSize] = useState<{ height: number; centres: number[] }>();

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () =>
      setSize({
        height: element.offsetHeight,
        centres: [...element.children].map(
          (row) =>
            (row as HTMLElement).offsetTop +
            (row as HTMLElement).offsetHeight / 2,
        ),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [list]);

  if (!size) return null;
  return (
    <svg
      aria-hidden
      width={CENTRE * 2}
      height={size.height}
      className="text-foreground pointer-events-none absolute top-0 left-0 hidden overflow-visible md:block"
    >
      <path
        key={beat}
        d={penPath(size.height, size.centres[beat])}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="scribble"
        style={{ "--dur": "900ms" } as React.CSSProperties}
      />
    </svg>
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
  const list = useRef<HTMLOListElement>(null);
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
      className="mx-auto grid w-full max-w-6xl items-center gap-6 px-5 py-6 md:grid-cols-2"
    >
      <div className="border-foreground bg-secondary mx-auto h-[340px] w-full max-w-[280px] overflow-hidden rounded-[2rem] border-4 px-4 shadow-[6px_6px_0_var(--primary)] md:h-[400px]">
        <p className="text-primary pt-3 text-center text-xs font-black tracking-wide">
          {BEATS[beat].day}
        </p>
        <Screen key={beat} beat={beat} />
      </div>
      <div className="relative md:pl-16">
        <PenLine beat={beat} list={list} />
        <ol ref={list} className="relative flex flex-col gap-1">
          {BEATS.map((item, index) => (
            <li key={item.day}>
              <button
                type="button"
                onClick={() => setBeat(index)}
                aria-current={beat === index ? "step" : undefined}
                className={`focus-visible:ring-highlight flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,opacity] duration-200 outline-none focus-visible:ring-3 ${beat === index ? "bg-secondary opacity-100" : "opacity-50 hover:opacity-80"}`}
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
    </div>
  );
}
