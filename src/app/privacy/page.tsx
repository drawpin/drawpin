import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy · DrawPin",
  description: "What DrawPin keeps, who else sees it, and for how long.",
};

export default function PrivacyPage() {
  return (
    // An inked card on the white page, like the home page (UI pass, 2026-10-05).
    <div className="flex flex-1 flex-col px-4 py-8">
      <main className="border-foreground mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-xl border-2 bg-white px-5 py-7 text-base leading-relaxed shadow-[5px_5px_0_var(--primary)] md:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight">Privacy</h1>
          <p className="text-muted-foreground text-xs">
            Last updated {POLICIES_UPDATED}
          </p>
        </div>

        <p>
          DrawPin is a shared drawing board for a restaurant, a classroom, a
          group of friends, whatever it was set up for. You can draw on it for
          fun without an account. Signing in is needed to post a drawing to the
          board, to vote, and to report a drawing.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">
            What we keep when you draw without signing in
          </h2>
          <p>
            Nothing. Without an account a drawing can&apos;t be posted, so it
            never leaves your device.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">What we keep when you sign in</h2>
          <ul className="list-disc pl-5">
            <li>
              Your email address: the one on your Google account, or the one you
              had a sign-in code sent to. With Google we also get the name on
              the account, only to suggest a username, which you can change.
            </li>
            <li>The username you choose, which is shown on your drawings.</li>
            <li>
              Each drawing you post, and its caption. These are public: anyone
              with the board&apos;s link can see them.
            </li>
            <li>
              An identifier stored in a cookie on your device, so a device that
              keeps getting drawings blocked can be paused for the day and posts
              can&apos;t arrive in a flood.
            </li>
            <li>
              A <strong>hash</strong> of your IP address and of a browser
              fingerprint, for the same purpose. We never store the address or
              the fingerprint themselves, and the hashes can&apos;t be turned
              back into them.
            </li>
            <li>Your votes, and any drawings you report.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Who else sees it</h2>
          <p>
            We don&apos;t sell anything to anyone, there is no advertising on
            DrawPin, and nothing tracks you across the site. These companies
            handle parts of it for us:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Supabase</strong> stores the database, the images and the
              sign-in sessions.
            </li>
            <li>
              <strong>Vercel</strong> runs the site, keeps short-lived request
              logs, and measures how quickly pages load (Speed Insights). That
              measurement uses no cookies and nothing that identifies you: just
              timings, the page, and the kind of device and connection.
            </li>
            <li>
              <strong>OpenAI</strong> checks every name, caption and drawing
              before it goes on the board, so we send those three things to
              their moderation service, and each drawing and caption to one of
              their models that reads what&apos;s written and drawn in it.
            </li>
            <li>
              <strong>Cloudflare</strong> runs the check that tells a person
              from a script.
            </li>
            <li>
              <strong>Google</strong>, if you choose to sign in with it.
            </li>
            <li>
              <strong>Resend</strong> delivers sign-in emails, so it sees the
              address a code is sent to.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">How long we keep it</h2>
          <ul className="list-disc pl-5">
            <li>
              A drawing that doesn&apos;t win its week is deleted 30 days after
              that week&apos;s voting ends, image and all.
            </li>
            <li>
              A drawing that wins stays in that board&apos;s Hall of Fame, which
              is the point of winning.
            </li>
            <li>
              Records of who posted on which day are deleted after 30 days.
            </li>
            <li>
              Device records are deleted after 90 days if nothing is attached to
              them.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Deleting your account</h2>
          <p>
            Sign in on any board, tap Your drawings next to Sign out, then
            Delete account at the bottom. That deletes your account, your
            drawings and your votes straight away. Anything of yours that won a
            week or a month stays in the Hall of Fame as part of that
            board&apos;s history, with your name taken off it. If you can&apos;t
            sign in any more, email us at{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll do it for you.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Cookies</h2>
          <p>
            One cookie identifies your device so those limits work, and signing
            in adds the cookies that keep you signed in. If you continue past a
            Late Night board&apos;s warning, one more remembers which boards you
            chose to see, so you aren&apos;t asked again. That&apos;s all of
            them, nothing for advertising or analytics.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Children</h2>
          <p>
            Drawing for fun needs no account and we ask nothing about who you
            are. Posting, voting and reporting need an account, through Google,
            which has its own age rules, or an email address.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-black">Contact</h2>
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
    </div>
  );
}
