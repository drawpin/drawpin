import type { Metadata } from "next";
import { CardPage } from "@/app/b/[slug]/board-look";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, getOwner, signedInLoginDestination } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · DrawPin" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Most visitors here are already signed in to draw, so being signed in
  // doesn't make someone an owner: only owners skip the form.
  const user = await getOwner();
  const account = user ? await getAccount(user, createAdminClient()) : null;
  const destination = account && signedInLoginDestination(account.kind);
  if (destination) redirect(destination);

  const { error } = await searchParams;
  const drawingAs = user && (account?.username ?? user.email);

  return (
    <CardPage
      note="For board owners"
      title="Sign in to DrawPin"
      intro={
        <p>
          Start a new board, or manage the one you have. We&apos;ll email you a
          code and a link, no password needed.
        </p>
      }
    >
      {/* Signing in with the board's email replaces this session, so the
          customer doesn't have to sign out first. The same email as their
          drawing account would just sign them back in to it and land here
          again, which is why the last sentence is there. */}
      {drawingAs && (
        <p className="bg-muted rounded-md px-3 py-2 text-center text-sm text-pretty">
          You&apos;re signed in as <strong>{drawingAs}</strong> for drawing.
          Sign in below with your board&apos;s email to switch this browser to
          it. Use a different email from the one you draw with.
        </p>
      )}
      {error === "link" && (
        <p role="alert" className="text-destructive text-center text-sm">
          That sign-in link didn&apos;t work. Links expire after 15 minutes and
          work once. Request a new one below.
        </p>
      )}
      <LoginForm
        turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
      {/* Customers sign in from the board itself, so anyone who
          lands here looking for that needs pointing back. */}
      <p className="text-muted-foreground text-center text-sm">
        Here to draw? You don&apos;t need this. Join a board from the{" "}
        <Link href="/" className="underline underline-offset-4">
          home page
        </Link>
        .
      </p>
    </CardPage>
  );
}
