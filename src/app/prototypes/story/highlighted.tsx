import { hand } from "@/lib/fonts";
import { Frame, LEARNED, STORY } from "./shared";

/** A yellow highlighter stroke behind a phrase, a little uneven. */
function Mark({ children }: { children: string }) {
  return (
    <mark className="text-foreground rounded-[0.2em] bg-[linear-gradient(100deg,transparent_0.15em,color-mix(in_srgb,var(--winner)_75%,transparent)_0.3em,color-mix(in_srgb,var(--winner)_60%,transparent)_92%,transparent)] [box-decoration-break:clone] px-1 py-0.5 font-semibold">
      {children}
    </mark>
  );
}

/**
 * Highlighted: editorial. The heart of it pulled out large on the left, the
 * paragraphs on the right with the key phrases gone over in highlighter,
 * and what was learned set out as tags rather than a long list.
 */
export function Highlighted() {
  return (
    <Frame>
      <article className="border-foreground grid gap-8 rounded-xl border-2 bg-white p-6 shadow-[6px_6px_0_var(--primary)] md:grid-cols-[1fr_1.4fr] md:gap-12 md:p-10">
        <div className="flex flex-col gap-4">
          <span
            aria-hidden
            className="text-primary font-serif text-8xl leading-[0.5]"
          >
            &ldquo;
          </span>
          <p className="text-3xl leading-tight font-black tracking-tight text-balance md:text-4xl">
            Software that gives everyone something{" "}
            <span className="text-primary">fun to do every day.</span>
          </p>
          <p
            className={`${hand.className} text-muted-foreground text-2xl font-bold`}
          >
            {STORY.signOff}
          </p>
        </div>
        <div className="text-muted-foreground flex flex-col gap-4 text-lg leading-relaxed">
          <p>
            I love it when software{" "}
            <Mark>makes a difference in people&apos;s everyday lives</Mark>.
            There seems to be a gap between software that makes work better and
            software that gives everyone something fun to do every day.
          </p>
          <p>
            DrawPin is my attempt to point what I know about building software
            in that direction. Draw a tile every day with your friend group, at
            work or at your favorite local spot. It goes up next to everyone
            else&apos;s, and{" "}
            <Mark>at the end of the week the competition begins</Mark>. That was
            the idea, anyway.
          </p>
          <p>{STORY.learnedLead}</p>
          <ul className="flex flex-wrap gap-2">
            {LEARNED.map((item) => (
              <li
                key={item}
                className="border-foreground text-foreground rounded-full border-2 bg-white px-3 py-1 text-sm font-bold"
              >
                {item}
              </li>
            ))}
            <li className="text-muted-foreground px-1 py-1 text-sm font-bold">
              and much more.
            </li>
          </ul>
          <p>
            It became a chance to bring groups of people a good time, and to
            give myself{" "}
            <Mark>a better learning experience than I ever expected</Mark>.
          </p>
        </div>
      </article>
    </Frame>
  );
}
