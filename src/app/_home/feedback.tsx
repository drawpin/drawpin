"use client";

import {
  ArrowSquareOutIcon,
  BugIcon,
  ChatCircleIcon,
  LightbulbIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  DETAILS_MAX,
  FEEDBACK_KINDS,
  TITLE_MAX,
  feedbackIssueUrl,
  type FeedbackKind,
} from "@/lib/feedback-issue";
import { INKED_BUTTON } from "../b/[slug]/board-look";
import { LEAD, NOTE, SECTION_TITLE } from "./type";

/** Yellow and ink hazard tape, for the card's top and bottom edges. */
const TAPE =
  "h-4 bg-[repeating-linear-gradient(-45deg,var(--winner)_0_14px,var(--foreground)_14px_28px)]";

const ICONS = { idea: LightbulbIcon, bug: BugIcon, other: ChatCircleIcon };

/** A traffic cone in flat ink, like the rest of the page's drawings. */
function Cone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" aria-hidden className={className}>
      <path
        d="M26 6h12l16 56H10z"
        fill="#ff821b"
        stroke="#0f1b2d"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M21 24h22l3 12H18z" fill="#fff" />
      <path d="M15 44h34l3 10H12z" fill="#fff" />
      <rect x="3" y="60" width="58" height="9" rx="2" fill="#0f1b2d" />
    </svg>
  );
}

const FIELD =
  "border-foreground focus-visible:ring-highlight w-full rounded-xl border-2 bg-white px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3";

/**
 * Feedback, as a construction zone (UI pass, 2026-10-05): DrawPin is always
 * being worked on, and anyone can send an idea, a bug or anything else. The
 * form opens a filled-in issue on the public GitHub repo for the person to
 * post from their own account (see `@/lib/feedback-issue`), so it's signed
 * in by GitHub and nothing is stored here.
 */
export function Feedback() {
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const url = feedbackIssueUrl({ kind, title, details });

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10">
      <div className="flex flex-col items-start gap-4">
        <p className={NOTE}>Always under construction</p>
        <h2 className={SECTION_TITLE}>Help build it.</h2>
      </div>
      <div className="border-foreground overflow-hidden rounded-xl border-2 bg-white shadow-[5px_5px_0_var(--foreground)]">
        <div className={`${TAPE} border-foreground border-b-2`} />
        <div className="grid gap-8 px-5 py-7 md:grid-cols-[1fr_1.3fr] md:px-8">
          <div className="flex flex-col items-start gap-4">
            <p className={LEAD}>
              DrawPin is continuously getting better, and a lot of that starts
              with feedback. Spotted a bug, or have an idea? Feel free to let me
              know!
            </p>
            <Cone className="hidden h-24 w-auto -rotate-6 md:block" />
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <div
              role="radiogroup"
              aria-label="What kind of feedback"
              className="flex flex-wrap gap-2"
            >
              {(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((key) => {
                const Icon = ICONS[key];
                const on = kind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setKind(key)}
                    className={`border-foreground focus-visible:ring-highlight inline-flex h-10 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold transition-colors duration-150 ease-out outline-none focus-visible:ring-3 ${on ? "bg-foreground text-white" : "hover:bg-secondary bg-white"}`}
                  >
                    <Icon weight="bold" className="size-4" />
                    {FEEDBACK_KINDS[key].label}
                  </button>
                );
              })}
            </div>
            <label className="sr-only" htmlFor="feedback-title">
              In a few words
            </label>
            <input
              id="feedback-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={TITLE_MAX}
              required
              placeholder={
                kind === "bug"
                  ? "What went wrong, in a few words"
                  : "Your idea, in a few words"
              }
              className={`${FIELD} h-12`}
            />
            <label className="sr-only" htmlFor="feedback-details">
              Details
            </label>
            <textarea
              id="feedback-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={DETAILS_MAX}
              rows={4}
              placeholder={
                kind === "bug"
                  ? "What happened, what you expected, and which phone or browser (optional)"
                  : "Anything else that would help (optional)"
              }
              className={`${FIELD} resize-y py-2.5`}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="submit" disabled={!url} className={INKED_BUTTON}>
                Open it on GitHub
                <ArrowSquareOutIcon weight="bold" className="size-5" />
              </button>
              <p className="text-muted-foreground max-w-xs text-sm">
                Opens a new GitHub issue, ready to post. You&apos;ll need a
                GitHub account, and issues are public.
              </p>
            </div>
          </form>
        </div>
        <div className={`${TAPE} border-foreground border-t-2`} />
      </div>
    </section>
  );
}
