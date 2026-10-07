import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms · DrawPin",
  description:
    "The rules for using DrawPin, and what happens to what you draw.",
};

export default function TermsPage() {
  return (
    // An inked card on the white page, like the home page (UI pass, 2026-10-05).
    <div className="flex flex-1 flex-col px-4 py-8">
      <main className="border-foreground mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-xl border-2 bg-white px-5 py-7 text-base leading-relaxed shadow-[5px_5px_0_var(--primary)] md:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight">Terms</h1>
          <p className="text-muted-foreground text-xs">
            Last updated {POLICIES_UPDATED}
          </p>
        </div>

        <p>
          DrawPin is free, for whoever sets up a board and for everyone drawing
          on it. It&apos;s provided as it is, with no promise that it will
          always be available.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">What you draw stays yours</h2>
          <p>
            Your drawing is yours. By posting it you let us and the board&apos;s
            owner show it on that board, and, if it wins a week, keep showing it
            in that board&apos;s Hall of Fame, which is kept indefinitely.
            Drawings that don&apos;t win are deleted 30 days after their
            week&apos;s voting ends; you can save your own from your account
            before then. Boards are public: anyone with the link can see
            what&apos;s on them.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Each board has its own rules</h2>
          <p>
            Whoever sets up a board picks how strict it is. All Ages blocks
            anything suggestive, crude or violent. Standard allows swearing,
            violence and gore. Late Night isn&apos;t moderated, and warns you
            before you go in. Every board links to its rules at the foot of the
            page. Follow the rules of the board you&apos;re posting to.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">On every board</h2>
          <ul className="list-disc pl-5">
            <li>Nothing illegal.</li>
            <li>Nothing that identifies someone else without their say-so.</li>
            <li>No spam.</li>
          </ul>
          <p>
            Captions and drawings are checked automatically against the
            board&apos;s rules before they appear, except on Late Night boards,
            which have no moderation. Usernames and board names are checked at
            the strictest level everywhere. Automatic checks can miss things:
            anyone signed in can report a drawing, and a board&apos;s owner can
            remove anything on their own board.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">The limits</h2>
          <p>
            Anyone can draw just for fun. Posting a drawing, voting and
            reporting need you to be signed in.
          </p>
          <ul className="list-disc pl-5">
            <li>One drawing a day per account on each board.</li>
            <li>
              A drawing that&apos;s blocked doesn&apos;t use up your post, but
              three blocked attempts in a day stop that device posting on the
              board until the next day.
            </li>
            <li>
              A week&apos;s drawings are voted on during the week after. Each
              account gets three votes a week on each board, on different
              drawings and never your own, and votes are final.
            </li>
            <li>
              The drawing with the most votes wins its week, with at least one
              vote; a tie goes to the one posted first.
            </li>
            <li>
              Each month, up to four of a board&apos;s weekly winners go to a
              one-week final, with one vote per account.
            </li>
          </ul>
          <p>
            Days and weeks turn over at 4:00 AM in the board&apos;s own time
            zone, and weeks start on Monday.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">When we step in</h2>
          <p>
            We can remove anything that breaks these rules and stop serving
            someone who keeps breaking them, or who is trying to break the
            voting. A board&apos;s owner can remove any drawing from it,
            including one that had already won, in which case that week is
            judged again without it, and can stop an account posting on their
            board.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Changes</h2>
          <p>
            If these terms change, the date at the top changes with them.
            Carrying on using DrawPin after that means the new ones apply.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Contact</h2>
          <p>
            <a
              className="underline underline-offset-4"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <Link href="/" className="underline underline-offset-4">
          Back to DrawPin
        </Link>
      </main>
    </div>
  );
}
