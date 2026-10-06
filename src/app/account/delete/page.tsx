import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CardPage } from "@/app/b/[slug]/board-look";
import { connection } from "next/server";
import { getCustomer } from "@/lib/customer";
import { safeNextPath } from "@/lib/next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = {
  title: "Delete your account · DrawPin",
  robots: { index: false },
};

/** Google's page for removing an app's access to a Google account. */
const GOOGLE_CONNECTIONS = "https://myaccount.google.com/connections";

/**
 * Says what deleting a DrawPin account does before it's done, since none of
 * it can be undone (docs/PLAN.md, Accounts).
 */
export default async function DeleteAccountPage({
  searchParams,
}: PageProps<"/account/delete">) {
  await connection();

  const { next } = await searchParams;
  const back = safeNextPath(typeof next === "string" ? next : null);
  const customer = await getCustomer(createAdminClient());
  if (!customer) redirect(back);

  return (
    <CardPage
      note="Your account"
      title="Delete your account?"
      intro={
        <p>
          You&apos;re signed in as{" "}
          <span className="text-foreground font-medium">
            {customer.username}
          </span>
          . This can&apos;t be undone.
        </p>
      }
    >
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>Your drawings are deleted from every board.</li>
        <li>
          A drawing that won a week or a month stays in that board&apos;s Hall
          of Fame, without your name.
        </li>
        <li>
          Your votes and reports are deleted. Votes on a week that&apos;s still
          being voted on stop counting.
        </li>
        <li>
          Your Google account isn&apos;t touched. To remove DrawPin from it too,
          go to{" "}
          <a
            href={GOOGLE_CONNECTIONS}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            your Google third-party connections
          </a>
          .
        </li>
        <li>Signing in again later starts a new, empty account.</li>
      </ul>

      <DeleteAccountForm back={back} />
    </CardPage>
  );
}
