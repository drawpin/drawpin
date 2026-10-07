"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type AdminTile, combineDrawings, type ReportedTile } from "./drawings";
import { Flag } from "./flag";
import { OwnerTileGrid } from "./owner-tiles";

type Filter = "all" | "reported";

const FILTERS: Filter[] = ["all", "reported"];

/** A section of the owner's screen: an inked card, as on the rest of it. */
const CARD =
  "border-foreground flex scroll-mt-6 flex-col gap-3 rounded-xl border-2 bg-white p-5 shadow-[4px_4px_0_var(--primary)]";

/**
 * This week's drawings, with the reported ones flagged among them, for the
 * owner to remove, block, or keep (docs/PLAN.md, Owner admin). Reports aren't
 * a section of their own: an All / Reported filter shows only them, and a
 * line above the card says when there are any and jumps there. The Reported
 * view also holds reported drawings from earlier weeks, so none is missed.
 * With no reports, the line and the filter aren't shown at all.
 */
export function BoardTiles({
  tiles,
  reported,
}: {
  tiles: AdminTile[];
  reported: ReportedTile[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const panelId = useId();
  const drawings = combineDrawings(tiles, reported);
  const reportedCount = drawings.reported.length;
  // Once the last report is dealt with, there's no Reported view to be on.
  const shownFilter = reportedCount === 0 ? "all" : filter;
  const shown = shownFilter === "all" ? drawings.all : drawings.reported;

  function seeReported() {
    setFilter("reported");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    sectionRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <>
      {reportedCount > 0 && (
        <p className="-mb-3 flex flex-wrap items-center gap-x-2 text-sm">
          <Flag className="size-5 shrink-0" />
          <span className="font-bold">
            {reportedCount} {reportedCount === 1 ? "drawing" : "drawings"}{" "}
            reported.
          </span>
          <button
            type="button"
            onClick={seeReported}
            className="focus-visible:ring-highlight text-primary -mx-1 inline-flex h-11 cursor-pointer items-center rounded-md px-1 font-bold underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3"
          >
            See them
          </button>
        </p>
      )}

      <section ref={sectionRef} aria-labelledby={headingId} className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={headingId} className="font-black tracking-tight">
            This week&apos;s drawings
          </h2>
          {reportedCount > 0 && (
            <FilterTabs
              value={shownFilter}
              onChange={setFilter}
              counts={{ all: drawings.all.length, reported: reportedCount }}
              panelId={panelId}
            />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {shownFilter === "reported"
            ? "Nothing is hidden automatically. Take a look and decide: Keep it clears the reports."
            : "Removing a drawing takes it off the board for everyone and deletes it. This can't be undone."}
        </p>

        <div
          id={panelId}
          {...(reportedCount > 0 && {
            role: "tabpanel",
            "aria-labelledby": `${panelId}-${shownFilter}`,
          })}
        >
          {shown.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No drawings on the board this week.
            </p>
          ) : (
            // Keyed by the view, so switching starts it at the top with no
            // drawing's options left open.
            <OwnerTileGrid
              key={shownFilter}
              tiles={shown}
              countLabel={
                reportedCount > 0
                  ? undefined
                  : `${shown.length} ${shown.length === 1 ? "drawing" : "drawings"}`
              }
            />
          )}
        </div>
      </section>
    </>
  );
}

/**
 * All / Reported as two tabs, with an inked pill that slides between them.
 * The tabs are the same width, so the pill only ever moves sideways. Arrow
 * keys move between them, as in any tab list.
 */
function FilterTabs({
  value,
  onChange,
  counts,
  panelId,
}: {
  value: Filter;
  onChange: (value: Filter) => void;
  counts: Record<Filter, number>;
  panelId: string;
}) {
  const refs = useRef<Record<Filter, HTMLButtonElement | null>>({
    all: null,
    reported: null,
  });

  function onKeyDown(event: KeyboardEvent) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const to =
      event.key === "Home"
        ? FILTERS[0]
        : event.key === "End"
          ? FILTERS[FILTERS.length - 1]
          : step
            ? FILTERS[
                (FILTERS.indexOf(value) + step + FILTERS.length) %
                  FILTERS.length
              ]
            : null;
    if (!to) return;
    event.preventDefault();
    onChange(to);
    refs.current[to]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Show"
      onKeyDown={onKeyDown}
      className="border-foreground relative grid grid-cols-2 rounded-xl border-2 bg-white p-0.5"
    >
      <span
        aria-hidden
        className={cn(
          "bg-secondary border-foreground absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-lg border-2 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          value === "reported" && "translate-x-full",
        )}
      />
      {FILTERS.map((key) => (
        <button
          key={key}
          ref={(element) => {
            refs.current[key] = element;
          }}
          id={`${panelId}-${key}`}
          type="button"
          role="tab"
          aria-selected={value === key}
          aria-controls={panelId}
          tabIndex={value === key ? 0 : -1}
          onClick={() => onChange(key)}
          className={cn(
            "focus-visible:ring-highlight relative inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors duration-150 ease-out outline-none focus-visible:ring-3 motion-reduce:transition-none",
            value === key
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {key === "reported" && <Flag className="size-4" />}
          {key === "all" ? "All" : "Reported"}
          <span className="tabular-nums">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}
