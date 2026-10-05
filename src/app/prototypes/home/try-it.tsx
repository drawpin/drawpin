"use client";

import {
  ArrowCounterClockwiseIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { HEADER_BUTTON, INKED_BUTTON, PAPER } from "../../b/[slug]/board-look";
import { PinnedDrawing } from "../../b/[slug]/pinned-drawing";
import type { Tile } from "../../b/[slug]/tiles";
import { EXAMPLE, Ending, Nav, TrophyBadge } from "./shared";

/** A few pens from the board's palette, plus ink. */
const PENS = ["#0f1b2d", "#004aad", "#ff821b", "#ffca39", "#22c55e"];

/**
 * Try it: the hero is a canvas. Draw something, pin it, and it lands on an
 * example board beside other people's. The reason to start is having
 * already started. Axis: interaction, doing instead of reading.
 */
export function TryIt() {
  return (
    <div data-board className="flex min-h-dvh flex-col">
      <header className="bg-primary text-primary-foreground border-foreground border-b-2">
        <Nav />
        <TryItPlay />
      </header>
      <Ending />
    </div>
  );
}

/** A light button on the tint, where the blue header's buttons would vanish. */
const TINT_BUTTON =
  "border-foreground hover:bg-secondary inline-flex h-12 items-center gap-2 rounded-xl border-2 bg-white px-4 text-sm font-bold";

/**
 * The canvas and, once pinned, the example board with your drawing on it.
 * `tone` is what it sits on: the blue hero, or the tint as its own section.
 */
export function TryItPlay({ tone = "blue" }: { tone?: "blue" | "tint" }) {
  const onBlue = tone === "blue";
  const Heading = onBlue ? "h1" : "h2";
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [pen, setPen] = useState(PENS[0]);
  const [drawn, setDrawn] = useState(false);
  const [pinned, setPinned] = useState<Tile | null>(null);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = event.currentTarget.width / rect.width;
    return {
      x: (event.clientX - rect.left) * scale,
      y: (event.clientY - rect.top) * scale,
    };
  }

  function stroke(to: { x: number; y: number }) {
    const context = canvas.current?.getContext("2d");
    const from = last.current;
    if (!context || !from) return;
    context.strokeStyle = pen;
    context.lineWidth = 14;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    last.current = to;
  }

  function clear() {
    const element = canvas.current;
    element?.getContext("2d")?.clearRect(0, 0, element.width, element.height);
    setDrawn(false);
  }

  function pin() {
    const element = canvas.current;
    if (!element) return;
    // The drawing on white, as a tile would be.
    const out = document.createElement("canvas");
    out.width = element.width;
    out.height = element.height;
    const context = out.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, out.width, out.height);
    context.drawImage(element, 0, 0);
    setPinned({
      id: "yours",
      author: "You#0001",
      caption: "my first one",
      isGuest: false,
      isOwn: false,
      imageUrl: out.toDataURL("image/png"),
      createdAt: "",
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 pt-2 pb-10 md:grid-cols-[1fr_1.05fr]">
      <section className="flex flex-col items-start gap-5">
        <p
          className={`${hand.className} bg-winner text-foreground -rotate-2 rounded-sm px-2.5 py-0.5 text-xl font-bold`}
        >
          {pinned ? "You're on the board!" : "Go on, try it"}
        </p>
        <Heading className="text-5xl leading-[1] font-black tracking-tight text-balance sm:text-6xl">
          {pinned ? "Now picture the whole room." : "Draw something."}
        </Heading>
        <p
          className={`max-w-sm text-lg ${onBlue ? "text-white/85" : "text-muted-foreground"}`}
        >
          {pinned
            ? "One drawing each a day, everyone votes, and the best one wins the week."
            : "That's how a board starts. No app, no sign-up."}
        </p>
        {pinned && (
          <div className="motion-safe:animate-fade-up flex flex-wrap gap-3">
            <a href="#join" className={INKED_BUTTON}>
              I have a code
            </a>
            <Link
              href="/login"
              className={onBlue ? HEADER_BUTTON : TINT_BUTTON}
            >
              Start a board
            </Link>
          </div>
        )}
      </section>

      {pinned ? (
        // The example board, with yours just pinned up first.
        <ul className="grid grid-cols-2 gap-x-5 gap-y-10 pt-6">
          {[pinned, ...EXAMPLE.slice(0, 3)].map((tile, index) => (
            <li
              key={tile.id}
              className={index === 0 ? "motion-safe:animate-drop-in" : ""}
            >
              <PinnedDrawing
                tile={tile}
                index={index}
                badge={index === 1 ? <TrophyBadge size={40} /> : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`pinned pin-pop relative mx-auto w-full max-w-sm -rotate-1 p-2 ${PAPER}`}
            style={pinStyle("#ffca39", 200)}
          >
            <div className="relative aspect-square w-full">
              <canvas
                ref={canvas}
                width={512}
                height={512}
                aria-label="Drawing area"
                className="absolute inset-0 size-full cursor-crosshair touch-none bg-white"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  last.current = point(event);
                  stroke({ ...last.current, x: last.current.x + 0.1 });
                  setDrawn(true);
                }}
                onPointerMove={(event) => {
                  if (last.current) stroke(point(event));
                }}
                onPointerUp={() => {
                  last.current = null;
                }}
              />
              {!drawn && (
                <p
                  className={`${hand.className} text-muted-foreground pointer-events-none absolute inset-0 grid place-items-center text-3xl font-bold`}
                >
                  draw here
                </p>
              )}
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-sm items-center justify-between gap-3">
            <div className="flex gap-1.5" role="radiogroup" aria-label="Pen">
              {PENS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={pen === color}
                  aria-label={`Pen ${color}`}
                  onClick={() => setPen(color)}
                  className={`size-7 shrink-0 rounded-full border-2 transition-transform duration-150 ${onBlue ? "border-white" : "border-foreground/20"} ${pen === color ? `scale-110 ring-2 ${onBlue ? "ring-white" : "ring-primary"}` : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                aria-label="Clear"
                className={`${onBlue ? HEADER_BUTTON : TINT_BUTTON} w-12 justify-center px-0`}
              >
                <ArrowCounterClockwiseIcon weight="bold" className="size-5" />
              </button>
              <button
                type="button"
                onClick={pin}
                disabled={!drawn}
                className={`${INKED_BUTTON} px-4 whitespace-nowrap`}
              >
                <PencilSimpleIcon weight="bold" className="size-5" />
                Pin it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
