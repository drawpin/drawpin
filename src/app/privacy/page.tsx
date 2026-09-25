import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy · DrawPin",
  description: "What DrawPin keeps, who else sees it, and for how long.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 text-sm leading-relaxed">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
        <p className="text-muted-foreground text-xs">
          Last updated {POLICIES_UPDATED}
        </p>
      </div>

      <p>
        DrawPin is a shared drawing board — for a restaurant, a classroom, a
        group of friends, whatever it was set up for. You can draw on it without
        an account. Signing in is only needed to be voted for, to vote, and to
        report a drawing.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">What we keep when you draw as a guest</h2>
        <ul className="list-disc pl-5">
          <li>
            Your drawing, and the name and caption you posted with it. These are
            public — anyone with the board&apos;s link can see them.
          </li>
          <li>
            An identifier stored in a cookie on your device, so the one drawing
            a day limit works.
          </li>
          <li>
            A <strong>hash</strong> of your IP address and of a browser
            fingerprint, for the same limit. We never store the address or the
            fingerprint themselves, and the hashes can&apos;t be turned back
            into them.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">What we keep when you sign in</h2>
        <ul className="list-disc pl-5">
          <li>
            The email address on your Google account, and the name on it — the
            name is only used to suggest a username, which you can change.
          </li>
          <li>The username you choose, which is shown on your drawings.</li>
          <li>Your votes, and any drawings you report.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Who else sees it</h2>
        <p>
          We don&apos;t sell anything to anyone, and there is no advertising or
          analytics on DrawPin. These companies handle parts of it for us:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Supabase</strong> stores the database, the images and the
            sign-in sessions.
          </li>
          <li>
            <strong>Vercel</strong> runs the site and keeps short-lived request
            logs.
          </li>
          <li>
            <strong>OpenAI</strong> checks every name, caption and drawing
            before it goes on the board, so we send those three things to their
            moderation service.
          </li>
          <li>
            <strong>Cloudflare</strong> runs the check that tells a person from
            a script.
          </li>
          <li>
            <strong>Google</strong>, if you choose to sign in with it.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">How long we keep it</h2>
        <ul className="list-disc pl-5">
          <li>
            A drawing that doesn&apos;t win its week is deleted 30 days after
            that week&apos;s voting ends, image and all.
          </li>
          <li>
            A drawing that wins stays in that board&apos;s Hall of Fame, which
            is the point of winning.
          </li>
          <li>Records of who posted on which day are deleted after 30 days.</li>
          <li>
            Device records are deleted after 90 days if nothing is attached to
            them.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Deleting your account</h2>
        <p>
          Email us at{" "}
          <a
            className="underline underline-offset-4"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          and we&apos;ll delete your account, your drawings and your votes.
          Anything of yours that won a week stays in the Hall of Fame as part of
          that board&apos;s history, with your name taken off it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Cookies</h2>
        <p>
          One cookie identifies your device so the daily limit works, and
          signing in adds the cookies that keep you signed in. That&apos;s all
          of them — nothing for advertising or analytics.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Children</h2>
        <p>
          Drawing needs no account and we ask nothing about who you are. Signing
          in uses a Google account, which has its own age rules.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Contact</h2>
        <p>
          Questions, corrections, or anything you&apos;d like removed:{" "}
          <a
            className="underline underline-offset-4"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <Link href="/" className="underline underline-offset-4">
        Back to DrawPin
      </Link>
    </main>
  );
}
