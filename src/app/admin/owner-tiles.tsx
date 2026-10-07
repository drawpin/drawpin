"use client";

import Image from "next/image";
import {
  type ReactNode,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  blockAccountAction,
  type BlockState,
  dismissReportsAction,
  removeTileAction,
  type RemoveTileState,
} from "./actions";
import type { AdminTile } from "./board-tiles";
import { columnCount, visibleRowsHeight } from "./tile-grid";

const idle: RemoveTileState = { status: "idle" };
const blockIdle: BlockState = { status: "idle" };

/** Rows of drawings shown before a grid scrolls inside its card. */
const VISIBLE_ROWS = 2;
/** How much of the next row shows under them, in px, as a hint to scroll. */
const PEEK = 24;

/**
 * The options over a tile show under a mouse, to a keyboard (any part of the
 * tile has visible focus), or once tapped open. `:focus-visible` rather than
 * `:focus-within` because a tap focuses the button on Android, which would
 * keep the options up after a second tap closes them.
 */
const SHOWN_ON_TILE =
  "group-hover/tile:pointer-events-auto group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:pointer-events-auto group-has-[:focus-visible]/tile:opacity-100 group-data-[open=true]/tile:pointer-events-auto group-data-[open=true]/tile:opacity-100";

/** A button over a tile, every one a full 44px target. */
const BUTTON =
  "focus-visible:ring-highlight inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-sm font-bold whitespace-nowrap outline-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:ring-3 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";
const INKED = `${BUTTON} border-foreground bg-white`;

const REMOVE = `${INKED} w-full hover:bg-winner`;
const BLOCK = `${INKED} w-full text-destructive hover:bg-destructive hover:text-white`;
const KEEP = `${INKED} w-full hover:bg-secondary`;
/** Side by side in a question when the tile is wide enough, else stacked. */
const CANCEL = `${INKED} flex-1 hover:bg-secondary`;
const CONFIRM = `${BUTTON} flex-1 border-destructive bg-destructive text-white hover:bg-destructive/85`;

/**
 * A drawing on the owner's screen. Its options (Remove, Block account for a
 * drawing posted by an account, and Keep it for a reported one) sit over the
 * drawing and appear on hover, keyboard focus or a tap. Remove and Block are
 * permanent, so each asks first, in the same place over the drawing.
 */
function OwnerTile({
  tile,
  open,
  onToggle,
  canKeep,
  children,
}: {
  tile: AdminTile;
  open: boolean;
  onToggle: () => void;
  canKeep: boolean;
  children: ReactNode;
}) {
  const [removeState, remove, removing] = useActionState(
    removeTileAction,
    idle,
  );
  const [blockState, block, blocking] = useActionState(
    blockAccountAction,
    blockIdle,
  );
  const [keepState, keep, keeping] = useActionState(dismissReportsAction, idle);
  const [asking, setAsking] = useState<"remove" | "block" | null>(null);
  const optionsId = useId();
  const drawingRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const wasAsking = useRef(false);
  const shown = open || asking !== null;
  const error = [removeState, blockState, keepState].find(
    (state) => state.status === "error",
  );

  // The option that was pressed goes away while its question shows, so focus
  // moves to the question's Cancel, and back to the drawing after it. On a
  // tile too small for the whole question it scrolls, and starts at the top
  // so the question is read before the buttons.
  useEffect(() => {
    const options = optionsRef.current;
    if (asking && options) {
      options
        .querySelector<HTMLButtonElement>("button[data-cancel]")
        ?.focus({ preventScroll: true });
      options.scrollTop = 0;
    } else if (wasAsking.current) {
      drawingRef.current?.focus();
    }
    wasAsking.current = asking !== null;
  }, [asking]);

  const answer = (label: string, pending: boolean, pendingLabel: string) => (
    <div className="flex flex-wrap gap-1">
      <button type="submit" disabled={pending} className={CONFIRM}>
        {pending ? pendingLabel : label}
      </button>
      <button
        type="button"
        data-cancel
        disabled={pending}
        className={CANCEL}
        onClick={() => setAsking(null)}
      >
        Cancel
      </button>
    </div>
  );

  return (
    <li className="flex flex-col gap-1">
      <div className="group/tile relative" data-open={shown}>
        <button
          ref={drawingRef}
          type="button"
          aria-expanded={shown}
          aria-controls={optionsId}
          onClick={onToggle}
          className="focus-visible:ring-highlight block w-full cursor-pointer rounded-lg outline-none focus-visible:ring-3"
        >
          <Image
            src={tile.imageUrl}
            alt={tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`}
            width={512}
            height={512}
            unoptimized
            className="border-border aspect-square w-full rounded-lg border-2 bg-white object-cover"
          />
        </button>

        {/* A tap on the tint, outside the buttons, closes it again. */}
        <div
          ref={optionsRef}
          id={optionsId}
          onClick={(event) => {
            if (!asking && !(event.target as Element).closest("button")) {
              onToggle();
            }
          }}
          className={`ring-foreground absolute inset-0 flex overflow-y-auto overscroll-contain rounded-lg p-1 ring-2 transition-opacity duration-150 ease-out ring-inset motion-reduce:transition-none ${asking ? "bg-white/95 opacity-100" : `bg-highlight/45 pointer-events-none opacity-0 ${SHOWN_ON_TILE}`}`}
        >
          {/* my-auto rather than justify-center, so a question too tall for
              a small tile scrolls from its top instead of being cut off. */}
          <div className="my-auto flex w-full flex-col gap-1">
            {asking === null && (
              <>
                <button
                  type="button"
                  className={REMOVE}
                  onClick={() => setAsking("remove")}
                >
                  Remove
                </button>
                {tile.canBlock && (
                  <button
                    type="button"
                    className={BLOCK}
                    onClick={() => setAsking("block")}
                  >
                    Block account
                  </button>
                )}
                {canKeep && (
                  <form action={keep}>
                    <input type="hidden" name="tileId" value={tile.id} />
                    <button type="submit" disabled={keeping} className={KEEP}>
                      {keeping ? "Keeping…" : "Keep it"}
                    </button>
                  </form>
                )}
              </>
            )}

            {asking === "remove" && (
              <form action={remove} className="flex flex-col gap-1">
                <input type="hidden" name="tileId" value={tile.id} />
                <p className="text-center text-sm font-bold">
                  Remove this drawing?
                </p>
                {answer("Remove", removing, "Removing…")}
              </form>
            )}

            {asking === "block" && (
              <form action={block} className="flex flex-col gap-1">
                <input type="hidden" name="tileId" value={tile.id} />
                <p className="px-1 text-xs leading-snug">
                  <span className="font-bold">
                    Block {tile.author ?? "this account"}?
                  </span>{" "}
                  They can&apos;t post, vote or report here, and their drawings
                  are removed.
                </p>
                {answer("Block", blocking, "Blocking…")}
              </form>
            )}
          </div>
        </div>
      </div>

      {children}

      {error?.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {error.message}
        </p>
      )}
    </li>
  );
}

/**
 * The owner's drawings as a grid with options over each one (see
 * {@link OwnerTile}). Past two rows it scrolls inside its card instead of
 * stretching the page, with a fade at the bottom edge until it's scrolled to
 * the end. Used for this week's drawings and for reported ones.
 *
 * @param countLabel - Said over the grid, like "12 drawings".
 * @param canKeep - Offer Keep it, which clears a drawing's reports.
 * @param details - What shows under each drawing.
 */
export function OwnerTileGrid<T extends AdminTile>({
  tiles,
  countLabel,
  canKeep = false,
  details,
}: {
  tiles: T[];
  countLabel: string;
  canKeep?: boolean;
  details: (tile: T) => ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [atEnd, setAtEnd] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);

  const checkEnd = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setAtEnd(list.scrollTop + list.clientHeight >= list.scrollHeight - 1);
  }, []);

  // Two rows depend on the column count and how tall captions wrap, so the
  // height is measured, and again whenever the list or a drawing resizes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const columns = columnCount(getComputedStyle(list).gridTemplateColumns);
      const tops = Array.from(
        list.children,
        (item) => (item as HTMLElement).offsetTop,
      );
      setMaxHeight(visibleRowsHeight(tops, columns, VISIBLE_ROWS, PEEK));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const item of list.children) observer.observe(item);
    return () => observer.disconnect();
  }, [tiles.length]);

  useEffect(checkEnd, [checkEnd, maxHeight]);

  const scrolls = maxHeight !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          <span className="hidden [@media(hover:hover)]:inline">
            Hover over a drawing for its options.
          </span>
          <span className="[@media(hover:hover)]:hidden">
            Tap a drawing for its options.
          </span>
        </p>
        <p className="shrink-0 font-bold tabular-nums">{countLabel}</p>
      </div>

      <div className="relative">
        {/* Padded so focus rings at the edges aren't cut off by the scroll
            box; `relative` makes it the items' offsetParent for measuring. */}
        <ul
          ref={listRef}
          onScroll={checkEnd}
          style={scrolls ? { maxHeight } : undefined}
          className={`relative -m-1 grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 ${scrolls ? "scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-y-contain" : ""}`}
        >
          {tiles.map((tile) => (
            <OwnerTile
              key={tile.id}
              tile={tile}
              canKeep={canKeep}
              open={openId === tile.id}
              onToggle={() =>
                setOpenId((current) => (current === tile.id ? null : tile.id))
              }
            >
              {details(tile)}
            </OwnerTile>
          ))}
        </ul>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 -bottom-1 h-10 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out motion-reduce:transition-none ${scrolls && !atEnd ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </div>
  );
}
