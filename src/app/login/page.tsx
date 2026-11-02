import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/sign-in-panel";
import { getOwner } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

export const metadata: Metadata = { title: "Sign in · DrawPin" };

/**
 * The full-page sign-in, for anyone: the same content as the sign-in sheet
 * (`SignInSheet`), for links in emails and for "Start a board" / "Manage my
 * board". One account draws and runs boards (ADR-013, ADR-016), so there is
 * a single way in. `?next=` is where to return to, checked as a plain path
 * on this site.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);

  // Already signed in: nothing to do here but carry on.
  if (await getOwner()) redirect(next);

  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-10">
      <main className="border-foreground mx-auto flex w-full max-w-sm flex-col gap-5 rounded-2xl border-2 bg-white px-5 py-7 shadow-[6px_6px_0_var(--primary)]">
        {error === "link" && (
          <p role="alert" className="text-destructive text-center text-sm">
            That sign-in link didn&apos;t work. Links expire after 15 minutes
            and work once. Request a new code below.
          </p>
        )}
        <SignInPanel next={next} variant="page" />
      </main>
    </div>
  );
}
