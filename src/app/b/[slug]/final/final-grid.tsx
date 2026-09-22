"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { TURNSTILE_FIELD } from "@/lib/turnstile/field";
import { castFinalVoteAction } from "./actions";
import { FinalistWall } from "./finalist-wall";
import type { Finalist } from "./data";
import type { FinalVoteState } from "./schema";

const initialState: FinalVoteState = { status: "idle" };

/**
 * The month's finalists, with the one vote each account gets
 * (docs/PLAN.md, Monthly super winner).
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
        <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
          Vote cast. That&apos;s your one for this month&apos;s final — the
          super winner is crowned when it closes.
        </p>
        <FinalistWall finalists={finalists} />
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      {picked && <input type="hidden" name="tileId" value={picked} />}
      <input type="hidden" name={TURNSTILE_FIELD} value={token ?? ""} />

      <p role="status" className="text-sm">
        One vote, and it&apos;s final.
      </p>

      <ul className="flex flex-col gap-4">
        {finalists.map((finalist, index) => (
          <li key={finalist.tileId}>
            <button
              type="button"
              onClick={() => setPicked(finalist.tileId)}
              disabled={finalist.isOwn || pending}
              aria-pressed={picked === finalist.tileId}
              className={`flex w-full flex-col gap-1 rounded-lg border p-2 text-left ${
                picked === finalist.tileId ? "border-primary border-2" : ""
              } ${finalist.isOwn ? "opacity-60" : ""}`}
            >
              <Image
                src={finalist.imageUrl}
                loading={index === 0 ? "eager" : "lazy"}
                alt={
                  finalist.caption ??
                  `Drawing by ${finalist.author ?? "a former member"}`
                }
                width={768}
                height={768}
                unoptimized
                className="aspect-square w-full rounded bg-white object-cover"
              />
              {finalist.caption && (
                <span className="text-sm break-words">{finalist.caption}</span>
              )}
              <span className="text-muted-foreground text-xs">
                {finalist.author ?? "A former member"} · won its week with{" "}
                {finalist.weekVotes}{" "}
                {finalist.weekVotes === 1 ? "vote" : "votes"}
                {finalist.isOwn && " · Yours"}
                {picked === finalist.tileId && " · picked"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {state.status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Turnstile siteKey={turnstileSiteKey} onToken={setToken} />

      <Button type="submit" size="lg" disabled={pending || !picked || !token}>
        {pending
          ? "Casting…"
          : !token
            ? "Checking your browser…"
            : picked
              ? "Cast my vote"
              : "Pick a drawing"}
      </Button>
    </form>
  );
}
