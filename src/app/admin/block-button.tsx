"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { blockAccountAction, type BlockState } from "./actions";
import type { AdminTile } from "./board-tiles";

const initialState: BlockState = { status: "idle" };

/**
 * Asks before blocking the account behind a drawing (ADR-008): it explains
 * what blocking does, then blocks on a second tap. Used on its own where the
 * first tap lives somewhere else, like the options over a tile.
 */
export function BlockConfirm({
  tile,
  onCancel,
}: {
  tile: AdminTile;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    blockAccountAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        className="flex flex-col gap-2 rounded-lg border p-2"
      >
        <input type="hidden" name="tileId" value={tile.id} />
        <p className="text-xs">
          Block {tile.author ?? "this account"}? They won&apos;t be able to
          post, vote or report on your board, and all their drawings here are
          removed. You can unblock them later, but the drawings don&apos;t come
          back.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={pending}
          >
            {pending ? "Blocking…" : "Block"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      )}
    </div>
  );
}

/**
 * Blocks the account behind a drawing (ADR-008). It takes down every drawing
 * they have here, which can't be undone, so the first tap only explains that.
 */
export function BlockButton({ tile }: { tile: AdminTile }) {
  const [confirming, setConfirming] = useState(false);

  if (!tile.canBlock) return null;

  return confirming ? (
    <BlockConfirm tile={tile} onCancel={() => setConfirming(false)} />
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive self-start"
      onClick={() => setConfirming(true)}
    >
      Block account
    </Button>
  );
}
