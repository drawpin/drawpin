"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { INKED_BUTTON, YELLOW_STRIP } from "../board-look";
import { CornerLabel, PinnedDrawing } from "../pinned-drawing";
import { DrawingsList } from "../vote/drawings-list";
import { castFinalVoteAction } from "./actions";
import type { Finalist } from "./data";
import { FinalistWall } from "./finalist-wall";
import { finalistTile, WonItsWeek } from "./finalists";
import type { FinalVoteState } from "./schema";

const initialState: FinalVoteState = { status: "idle" };

/**
 * The month's finalists, with the one vote each account gets
 * (docs/PLAN.md, Monthly super winner). In the board's look (UI pass,
 * 2026-10-05), like weekly voting: pinned polaroids, a tap picks one (it
 * lifts, straightens and gets a yellow check), and the Cast button stays in
 * reach at the foot of the screen. Picking another moves the pick.
 */
export function FinalGrid({
  slug,
  finalists,
  turnstileSiteKey,
}: {
  slug: string;
  finalists: Finalist[];
  turnstileSiteKey: string;
}) {
  const [state, formAction, pending] = useActionState(
    castFinalVoteAction,
    initialState,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  if (state.status === "cast") {
    return (
      <>
        <p role="status" className={`${YELLOW_STRIP} text-2xl leading-tight`}>
          Vote cast. That&apos;s your one for this month&apos;s final, and the
          super winner is crowned when it closes.
        </p>
        <FinalistWall finalists={finalists} />
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      {picked && <input type="hidden" name="tileId" value={picked} />}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />

      <p role="status" className="text-muted-foreground text-sm font-semibold">
        Tap a drawing to pick it. One vote, and it&apos;s final.
      </p>

      <DrawingsList>
        {finalists.map((finalist, index) => {
          const isPicked = picked === finalist.tileId;
          return (
            <div key={finalist.tileId} className="flex flex-col gap-2">
              <PinnedDrawing
                tile={finalistTile(finalist)}
                index={index}
                picked={isPicked}
                disabled={finalist.isOwn || pending}
                dim={finalist.isOwn}
                onPick={() => setPicked(isPicked ? null : finalist.tileId)}
                badge={
                  finalist.isOwn ? (
                    <CornerLabel>Yours</CornerLabel>
                  ) : isPicked ? (
                    <span
                      aria-hidden
                      className="vote-check border-foreground bg-winner text-foreground absolute -right-3 -bottom-3 grid size-10 place-items-center rounded-full border-2"
                    >
                      <CheckIcon weight="bold" className="size-5" />
                    </span>
                  ) : null
                }
              />
              <WonItsWeek finalist={finalist} />
            </div>
          );
        })}
      </DrawingsList>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} />

      {/* Stays in reach while scrolling through the finalists. */}
      <div className="sticky bottom-4 z-20">
        <button
          type="submit"
          disabled={pending || !picked || !token}
          className={`${INKED_BUTTON} h-14 w-full text-lg`}
        >
          {pending
            ? "Casting…"
            : !token
              ? "Checking your browser…"
              : picked
                ? "Cast my vote"
                : "Pick a drawing"}
        </button>
      </div>
    </form>
  );
}
