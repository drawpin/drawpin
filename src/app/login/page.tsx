import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · DrawPin" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getOwner()) redirect("/admin");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to DrawPin
        </h1>
        <p className="text-muted-foreground text-sm">
          For venue owners. We&apos;ll email you a link — no password needed.
        </p>
      </div>
      {error === "link" && (
        <p role="alert" className="text-destructive text-center text-sm">
          That sign-in link didn&apos;t work. Links expire after 15 minutes and
          work once. Request a new one below.
        </p>
      )}
      <LoginForm
        turnstileSiteKey={serverEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
      {/* Customers sign in with Google from the board itself, so anyone who
          lands here looking for that needs pointing back. */}
      <p className="text-muted-foreground text-center text-sm">
        Here to draw? You don&apos;t need this — join a board from the{" "}
        <Link href="/" className="underline underline-offset-4">
          home page
        </Link>
        .
      </p>
    </main>
  );
}
