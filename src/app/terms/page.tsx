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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 text-sm leading-relaxed">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Terms</h1>
        <p className="text-muted-foreground text-xs">
          Last updated {POLICIES_UPDATED}
        </p>
      </div>

      <p>
        DrawPin is free, for whoever sets up a board and for everyone drawing on
        it. It&apos;s provided as it is, with no promise that it will always be
        available.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">What you draw stays yours</h2>
        <p>
          Your drawing is yours. By posting it you let us and the board&apos;s
          owner show it on that board, and — if it wins a week — keep showing it
          in that board&apos;s Hall of Fame, which is kept indefinitely. Boards
          are public: anyone with the link can see what&apos;s on them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">What not to post</h2>
        <ul className="list-disc pl-5">
          <li>Anything illegal, hateful, sexual, or violent.</li>
          <li>Adverts, links, spam, or contact details.</li>
          <li>
            Anything that identifies someone else, or that you&apos;d be
            embarrassed to see on a wall in that café.
          </li>
        </ul>
        <p>
          Every name, caption and drawing is checked automatically before it
          appears. Anyone signed in can report anything that slips through, and
          a board&apos;s owner can remove anything on their own board.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">The limits</h2>
        <ul className="list-disc pl-5">
          <li>One drawing per device per day, and one per account per day.</li>
          <li>
            Three votes per account per week, on different drawings, never your
            own, and votes are final.
          </li>
          <li>One vote per account in a monthly final.</li>
        </ul>
        <p>
          Days and weeks turn over at 4:00 AM in the board&apos;s own time zone.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">When we step in</h2>
        <p>
          We can remove anything that breaks these rules and stop serving
          someone who keeps breaking them, or who is trying to break the voting.
          A board&apos;s owner can remove any drawing from it, including one
          that had already won — in which case that week is judged again without
          it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Changes</h2>
        <p>
          If these terms change, the date at the top changes with them. Carrying
          on using DrawPin after that means the new ones apply.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Contact</h2>
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
  );
}
