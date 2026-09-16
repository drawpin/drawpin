import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
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
          That sign-in link is invalid or has expired. Request a new one.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
