"use client";

import { useActionState, useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { ChangeNameState } from "@/lib/change-username";
import { HEADER_BUTTON, INKED_BUTTON } from "../b/[slug]/board-look";
import { changeName } from "./actions";

const initialState: ChangeNameState = { status: "idle" };

/**
 * The profile's header content: the initial, `Name#tag`, when they joined,
 * and a way to change the name right there (docs/design/profiles.md, 4).
 * Saving closes the form; a refused name stays open with the reason under
 * the field; Escape cancels.
 */
export function ProfileHeader({
  username,
  tag,
  since,
}: {
  username: string;
  tag: string;
  /** "October 2026". */
  since: string;
}) {
  const [state, formAction, pending] = useActionState(changeName, initialState);
  // The form is open while the state it was opened with is current, or while
  // an error is showing. A save produces a new "saved" state, which closes it
  // without an effect.
  const [openedFor, setOpenedFor] = useState<ChangeNameState | null>(null);
  const editing =
    openedFor !== null && !(state.status === "saved" && state !== openedFor);

  return (
    <>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="border-foreground bg-winner text-foreground flex size-16 shrink-0 items-center justify-center rounded-full border-2 text-3xl font-black shadow-[3px_3px_0_var(--foreground)]"
        >
          {username.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-4xl leading-[1.02] font-black tracking-tight break-words">
            {username}
            <span className="font-bold text-white/70">#{tag}</span>
          </h1>
          <p className="mt-1 text-sm text-white/85">Drawing since {since}</p>
        </div>
      </div>

      {editing ? (
        <form
          action={formAction}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpenedFor(null);
          }}
          className="flex max-w-md flex-col gap-2"
        >
          <label htmlFor="username" className="text-sm font-bold">
            Your name on the board
          </label>
          <div className="flex gap-2">
            <input
              id="username"
              name="username"
              defaultValue={username}
              maxLength={40}
              autoComplete="nickname"
              autoFocus
              required
              aria-invalid={state.status === "error"}
              aria-describedby={
                state.status === "error" ? "username-error" : "username-hint"
              }
              className="border-foreground text-foreground focus-visible:ring-winner h-12 min-w-0 flex-1 rounded-xl border-2 bg-white px-3.5 outline-none focus-visible:ring-3"
            />
            <button type="submit" disabled={pending} className={INKED_BUTTON}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
          {state.status === "error" && (
            <p
              id="username-error"
              role="alert"
              className="text-destructive w-fit rounded-md bg-white px-2 py-0.5 text-sm font-semibold"
            >
              {state.message}
            </p>
          )}
          <p id="username-hint" className="text-sm text-white/85">
            New names show on drawings you post from now on. Your tag follows
            your name, so it can change with it.
          </p>
        </form>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setOpenedFor(state)}
            className={HEADER_BUTTON}
          >
            <PencilSimpleIcon weight="bold" className="size-5" />
            Change your name
          </button>
        </div>
      )}
    </>
  );
}
