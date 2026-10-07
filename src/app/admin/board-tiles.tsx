"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import Image from "next/image";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { removeTileAction, type RemoveTileState } from "./actions";
import { BlockConfirm } from "./block-button";
import { columnCount, visibleRowsHeight } from "./tile-grid";

export type AdminTile = {
  id: string;
  author: string | null;
  /** Posted by an account, which the owner can block (ADR-008). */
  canBlock: boolean;
  caption: string | null;
  imageUrl: string;
};

const initialState: RemoveTileState = { status: "idle" };

/** Rows of drawings shown before the list scrolls inside its card. */
const VISIBLE_ROWS = 2;
/** How much of the next row shows under them, in px, as a hint to scroll. */
const PEEK = 24;

/**
 * Over a tile: shown under a mouse, to a keyboard (any part of the tile has
 * visible focus), or once tapped open. `:focus-visible` rather than
 * `:focus-within` because a tap focuses the button on Android, which would
 * keep the options up after a second tap closes them.
 */
const SHOWN_ON_TILE =
  "group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:opacity-100 group-data-[open=true]/tile:opacity-100";

/**
 * A drawing on the owner's screen. Its options (Remove, and Block account
 * for a signed-in poster) sit over the drawing and appear on hover, keyboard
 * focus or a tap. Both are permanent, so each asks first, under the drawing.
 */
function TileCard({
  tile,
  open,
  onToggle,
}: {
  tile: AdminTile;
  open: boolean;
  onToggle: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    removeTileAction,
    initialState,
  );
  const [confirming, setConfirming] = useState<"remove" | "block" | null>(null);
  const optionsId = useId();
  const drawingRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);
  const alt = tile.caption ?? `Drawing by ${tile.author ?? "a guest"}`;

  // The option that was pressed goes away while its question shows, so focus
  // moves to the question's Cancel, and back to the drawing after it.
  useEffect(() => {
    if (confirming) {
      confirmRef.current
        ?.querySelector<HTMLButtonElement>('button[type="button"]')
        ?.focus();
    } else if (wasConfirming.current) {
      drawingRef.current?.focus();
    }
    wasConfirming.current = confirming !== null;
  }, [confirming]);

  return (
    <li className="flex flex-col gap-1">
      <div className="group/tile relative" data-open={open}>
        <button
          ref={drawingRef}
          type="button"
          aria-expanded={open}
          aria-controls={optionsId}
          onClick={onToggle}
          className="focus-visible:ring-highlight block w-full cursor-pointer rounded-lg outline-none focus-visible:ring-3"
        >
          <Image
            src={tile.imageUrl}
            alt={alt}
            width={512}
            height={512}
            unoptimized
            className="border-border group-hover/tile:border-foreground group-data-[open=true]/tile:border-foreground aspect-square w-full rounded-lg border-2 bg-white object-cover"
          />
        </button>

        {/* Says there's something here before anyone hovers. */}
        <span
          aria-hidden
          className="border-foreground pointer-events-none absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full border-2 bg-white transition-opacity duration-150 ease-out group-hover/tile:opacity-0 group-has-[:focus-visible]/tile:opacity-0 group-data-[open=true]/tile:opacity-0 motion-reduce:transition-none"
        >
          <DotsThreeIcon weight="bold" className="size-4" />
        </span>

        {confirming === null && (
          <div
            id={optionsId}
            className={`pointer-events-none absolute inset-x-1.5 bottom-1.5 flex translate-y-1 flex-col gap-1.5 opacity-0 transition-[opacity,translate] duration-150 ease-out group-hover/tile:pointer-events-auto group-hover/tile:translate-y-0 group-has-[:focus-visible]/tile:pointer-events-auto group-has-[:focus-visible]/tile:translate-y-0 group-data-[open=true]/tile:pointer-events-auto group-data-[open=true]/tile:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none ${SHOWN_ON_TILE}`}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2"
              onClick={() => setConfirming("remove")}
            >
              Remove
            </Button>
            {tile.canBlock && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive px-2"
                onClick={() => setConfirming("block")}
              >
                Block account
              </Button>
            )}
          </div>
        )}
      </div>

      {tile.caption && <p className="text-sm break-words">{tile.caption}</p>}
      <p className="text-muted-foreground text-xs">{tile.author ?? "Guest"}</p>

      <div ref={confirmRef}>
        {confirming === "remove" && (
          <form action={formAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="tileId" value={tile.id} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={pending}
            >
              {pending ? "Removing…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
          </form>
        )}
        {confirming === "block" && (
          <BlockConfirm tile={tile} onCancel={() => setConfirming(null)} />
        )}
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </li>
  );
}

/**
 * This week's drawings, for the owner to remove or block. Past two rows the
 * list scrolls inside its card instead of stretching the page, with a fade
 * at the bottom edge until it's scrolled to the end.
 */
export function BoardTiles({ tiles }: { tiles: AdminTile[] }) {
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
  // height is measured, and again whenever the list or a drawing resizes
  // (a width change, or a question opening under one).
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

  if (tiles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No drawings on the board this week.
      </p>
    );
  }

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
        <p className="shrink-0 font-bold tabular-nums">
          {tiles.length} {tiles.length === 1 ? "drawing" : "drawings"}
        </p>
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
            <TileCard
              key={tile.id}
              tile={tile}
              open={openId === tile.id}
              onToggle={() =>
                setOpenId((current) => (current === tile.id ? null : tile.id))
              }
            />
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
