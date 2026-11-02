import Link from "next/link";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { startCard } from "@/lib/home-hub";
import { INKED_BUTTON } from "../b/[slug]/board-look";
import { CARD_TITLE } from "../_home/type";
import { JoinForm } from "../join/join-form";

/**
 * "Have a code?" and "Start a board", side by side from `md`, as on the
 * marketing page's ending. Start goes straight to setup, since the hub is
 * only ever signed in; at the cap it says so and has no button.
 */
export function JoinStartSection({ runs }: { runs: number }) {
  const start = startCard(runs);
  return (
    <section className="grid gap-6 md:grid-cols-2" aria-label="More boards">
      <div className="border-foreground flex flex-col gap-3 rounded-xl border-2 bg-white px-5 py-6 shadow-[5px_5px_0_var(--primary)]">
        <h2 className={CARD_TITLE}>Have a code?</h2>
        <p className="text-muted-foreground -mt-1">
          It&apos;s the 8-digit code on the board&apos;s card.
        </p>
        <JoinForm />
      </div>
      <div className="bg-primary text-primary-foreground border-foreground flex flex-col items-start gap-3 rounded-xl border-2 px-5 py-6 shadow-[5px_5px_0_var(--foreground)]">
        <h2 className={CARD_TITLE}>Start a board</h2>
        <p className="text-white/85">{start.line}</p>
        {start.canStart && (
          <Link href="/setup" className={`${INKED_BUTTON} mt-auto`}>
            <PlusIcon weight="bold" className="size-5" />
            Start a board
          </Link>
        )}
      </div>
    </section>
  );
}
