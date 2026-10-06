"use client";

import {
  ArrowCounterClockwiseIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { INKED_BUTTON, PAPER } from "../b/[slug]/board-look";
import type { Tile } from "../b/[slug]/tiles";
import { Podium } from "../b/[slug]/vote/podium";
import { LEAD, NOTE, OUTLINE_BUTTON, SECTION_TITLE } from "./type";

/** A few pens from the board's palette, plus ink. */
const PENS = ["#0f1b2d", "#004aad", "#ff821b", "#ffca39", "#22c55e"];

/**
 * Try it: a real canvas, right on the home page. Draw something and pin it,
 * and instead of more example drawings it shows what could be: yours on the
 * top step of the real vote podium, with the gold trophy. Then another go.
 */
export function TryItPlay() {
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
      caption: null,
      isGuest: false,
      isOwn: false,
      imageUrl: out.toDataURL("image/png"),
      createdAt: "",
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 md:grid-cols-2">
      <section className="flex flex-col items-start gap-4">
        <p className={NOTE}>{pinned ? "Picture this" : "Go on, try it"}</p>
        <h2 className={SECTION_TITLE}>
          {pinned ? "Your drawing, first place." : "Draw something."}
        </h2>
        <p className={LEAD}>
          {pinned
            ? "Everyone draws one a day and votes on the week. The best one gets the trophy."
            : "That's how a board starts. No app, no sign-up."}
        </p>
        {pinned && (
          // Not the hero's buttons again: another go, since drawing is
          // the point.
          <button
            type="button"
            onClick={() => {
              setPinned(null);
              setDrawn(false);
            }}
            className={`motion-safe:animate-fade-up ${OUTLINE_BUTTON}`}
          >
            <ArrowCounterClockwiseIcon weight="bold" className="size-5" />
            Draw another
          </button>
        )}
      </section>

      {pinned ? (
        // What could be: yours on the top step, the trophy under it.
        <div className="mx-auto w-full max-w-md">
          <Podium
            heading="This week's winner"
            leaders={[{ place: 1, tile: pinned, votes: 67 }]}
          />
        </div>
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
                  className={`border-foreground/20 size-7 shrink-0 rounded-full border-2 transition-transform duration-150 ${pen === color ? "ring-primary scale-110 ring-2" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                aria-label="Clear"
                className={`${OUTLINE_BUTTON} w-12 justify-center px-0`}
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
