import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { connection } from "next/server";
import { hand } from "@/lib/fonts";
import { MODERATION_LEVEL_INFO } from "@/lib/moderation/levels";
import { BoardLayout, HEADER_BUTTON } from "../board-look";
import { getBoard, requireBoard } from "../data";

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/rules">): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return {
    title: board ? `Board rules · ${board.name}` : "Board not found · DrawPin",
  };
}

/** A section of the page: an inked card, like the owner's settings. */
const CARD =
  "border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white p-5 shadow-[4px_4px_0_var(--primary)]";

/**
 * What this board's moderation level allows (ADR-012), reached from the quiet
 * link at the foot of the board and from the Late Night warning. Never behind
 * that warning itself, so anyone can read the rules before deciding.
 */
export default async function BoardRulesPage({
  params,
}: PageProps<"/b/[slug]/rules">) {
  // The owner can change the level at any time.
  await connection();

  const { slug } = await params;
  const board = await requireBoard(slug, "/rules");
  const info = MODERATION_LEVEL_INFO[board.moderationLevel];

  return (
    <BoardLayout
      narrow
      header={
        <>
          <p
            className={`${hand.className} bg-winner text-foreground w-fit -rotate-2 rounded-sm px-2.5 py-0.5 text-xl leading-tight font-bold`}
          >
            {info.name}
          </p>
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl leading-[1.02] font-black tracking-tight">
              Board rules
            </h1>
            <p className="text-sm break-words text-white/80">{board.name}</p>
          </div>
          <Link href={`/b/${board.slug}`} className={`${HEADER_BUTTON} w-fit`}>
            <ArrowLeftIcon weight="bold" className="size-5" />
            Back to the board
          </Link>
        </>
      }
    >
      <section className={CARD}>
        <h2 className="font-black tracking-tight">
          This board is on {info.name}
        </h2>
        <p>{info.summary}</p>
        <p className="text-muted-foreground text-sm">
          The board&apos;s owner picks its rules.
        </p>
      </section>

      {info.allowed.length > 0 && (
        <section className={CARD}>
          <h2 className="font-black tracking-tight">Allowed here</h2>
          <ul className="list-disc pl-5">
            {info.allowed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={CARD}>
        <h2 className="font-black tracking-tight">Blocked here</h2>
        <ul className="list-disc pl-5">
          {info.blocked.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {board.moderationLevel !== "late_night" && (
          <p className="text-muted-foreground text-sm">
            Checks are automatic, so now and then something slips through.
          </p>
        )}
      </section>

      <section className={CARD}>
        <h2 className="font-black tracking-tight">On every board</h2>
        <p>
          Sexual content involving minors is always blocked, and posting
          anything illegal is against the Terms on every board. Usernames and
          board names are checked at the strictest level, whatever a
          board&apos;s rules.
        </p>
        <p>
          If something here shouldn&apos;t be, anyone signed in can report it,
          and the board&apos;s owner can remove any drawing.
        </p>
        <p className="text-muted-foreground text-sm">
          See the{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>{" "}
          for the rules that apply on every board.
        </p>
      </section>
    </BoardLayout>
  );
}
