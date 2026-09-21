import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JoinForm } from "./join/join-form";

/** How a tile gets from a table to a Hall of Fame, in the order it happens. */
const STEPS = [
  {
    title: "Scan, or type the code",
    body: "The QR on the table opens that venue's board. No app, and nothing to install. If you can't scan, today's code is on the counter.",
  },
  {
    title: "Draw one tile",
    body: "A few colours, a few brushes, and a caption if you want one. One drawing each per day, so the board stays a room rather than one person.",
  },
  {
    title: "Come back and vote",
    body: "Next week you pick three from the week before. The most-voted drawing wins the week and stays in the venue's Hall of Fame; each month, the best of those winners meet again.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
        <span className="font-semibold tracking-tight">DrawPin</span>
        <nav className="flex items-center gap-1">
          <a
            href="#join"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Have a code?
          </a>
          {/* Customers sign in from the board they're standing in front of,
              where it unlocks voting; this is the venue's way in. */}
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            For venues
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-6 py-10">
        <section className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A drawing board for your local spot
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            Scan the code on the table and draw something. It lands on the board
            everyone else in the room is looking at. No app, no account — until
            you want to vote.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#join" className={buttonVariants({ size: "lg" })}>
              I have a code
            </a>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Create a board
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="text-muted-foreground font-mono text-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="join" className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Open a board
            </h2>
            <p className="text-muted-foreground text-sm">
              Type the 8-digit code from the counter. It changes every morning.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <JoinForm />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t pt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Why I made this
          </h2>
          <div className="text-muted-foreground flex flex-col gap-3 text-sm leading-relaxed">
            <p>
              The few minutes you spend waiting for a coffee are a strange gap
              in the day — long enough to be bored, too short to start anything.
              Everyone fills it the same way, looking down at a phone on their
              own.
            </p>
            <p>
              DrawPin is an attempt to point that at the room instead. You draw
              one small thing, it goes up next to what strangers drew this
              morning, and at the end of the week the room decides which one it
              liked. Nothing to install, nothing to sign up for, and it costs
              the café nothing to run.
            </p>
          </div>
        </section>

        <section className="bg-muted flex flex-col items-start gap-3 rounded-xl px-6 py-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Running a café, bar, or anywhere people wait?
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            Print one QR code and the board looks after itself. Every drawing is
            checked before it appears, the week rolls over on its own, and a
            winner is crowned without you touching anything. You get one screen:
            the code to print, a pause switch, and the ability to take anything
            down.
          </p>
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Create a board — free
          </Link>
        </section>
      </main>
    </div>
  );
}
