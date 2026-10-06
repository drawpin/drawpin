import type { Metadata } from "next";
import { CardPage } from "@/app/b/[slug]/board-look";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · DrawPin" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Anyone already signed in, to draw or to run a board, goes straight on:
  // one account can do both (ADR-013). /admin shows their board, or sends
  // them to set one up if they don't have one yet.
  if (await getOwner()) redirect("/admin");

  const { error } = await searchParams;

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
