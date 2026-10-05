import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { getCustomer } from "@/lib/customer";
import { KEPT_FOR_DAYS } from "@/lib/my-drawings";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMyDrawings } from "@/lib/supabase-my-drawings";

export const metadata: Metadata = {
  title: "Your drawings · DrawPin",
  robots: { index: false },
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

/**
 * Everything the signed-in account has drawn, on every board, with a way to
 * keep each one before the 30-day clean-up (issue #57). Deleting the account
 * lives at the bottom.
 */
export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  await connection();

  const { next } = await searchParams;
  const back = safeNextPath(typeof next === "string" ? next : null);
  const admin = createAdminClient();
  const customer = await getCustomer(admin);
  if (!customer) redirect(back);

  const drawings = await listMyDrawings(admin, customer.id);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <Link
          href={back}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Your drawings</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as <span className="font-medium">{customer.username}</span>.
          Drawings that don&apos;t win are deleted {KEPT_FOR_DAYS} days after
          their week&apos;s voting ends, so save the ones you want to keep.
        </p>
      </header>

      {drawings.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border px-3 py-6 text-center text-sm">
          Nothing here yet. Drawings you post show up here.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {drawings.map((drawing) => (
            <li key={drawing.id} className="flex min-w-0 flex-col gap-1">
              <Image
                src={drawing.imageUrl}
                alt={drawing.caption ?? `Your drawing on ${drawing.boardName}`}
                width={512}
                height={512}
                unoptimized
                className="aspect-square w-full rounded-lg border bg-white object-cover"
              />
              <p className="truncate text-sm font-medium">
                {drawing.boardName}
              </p>
              {drawing.caption && (
                <p className="text-muted-foreground truncate text-xs">
                  {drawing.caption}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                {formatDay(drawing.postedAt)} ·{" "}
                {drawing.isWinner
                  ? "A winner, kept for good"
                  : `Kept until ${formatDay(drawing.deletedAfter!)}`}
              </p>
              <a
                href={`/account/drawings/${drawing.id}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-1",
                })}
              >
                Save as PNG
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-1 border-t pt-6">
        <h2 className="text-sm font-medium">Your account</h2>
        <p className="text-muted-foreground text-xs">
          Deleting your account deletes your drawings and votes. Winners stay in
          their board&apos;s Hall of Fame, without your name.
        </p>
        <Link
          href={`/account/delete?next=${encodeURIComponent(back)}`}
          className="text-destructive self-start text-sm underline underline-offset-4"
        >
          Delete account
        </Link>
      </section>
    </main>
  );
}
