import { pinStyle } from "@/components/pin";
import { hand } from "@/lib/fonts";
import { Frame, LEARNED_SENTENCE, STORY } from "./shared";

/** Faint ruled lines, like a notepad page, under the text. */
const RULED =
  "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_calc(2rem-1px),color-mix(in_srgb,var(--primary)_14%,transparent)_2rem)]";

/**
 * Letter: the story as a note pinned to the page, written to the reader.
 * A handwritten greeting and sign-off, ruled paper with a red margin line,
 * and the body in the page's own type on the lines.
 */
export function Letter() {
  return (
    <Frame>
      <article
        className="pinned pin-pop border-foreground relative -rotate-[0.6deg] rounded-sm border-2 bg-white shadow-[6px_6px_0_var(--foreground)]"
        style={pinStyle("#ff821b", 150)}
      >
        <div
          className={`${RULED} relative bg-[position:0_20px] px-6 pt-8 pb-8 text-lg leading-8 md:pr-12 md:pl-20`}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-12 hidden w-0.5 bg-[#ff821b]/50 md:block"
          />
          <p
            className={`${hand.className} text-primary text-3xl leading-8 font-bold`}
          >
            Hi there,
          </p>
          <div className="text-foreground/85 flex flex-col gap-8">
            <p>{STORY.gap}</p>
            <p>{STORY.idea}</p>
            <p>
              {STORY.learnedLead} {LEARNED_SENTENCE} {STORY.learnedTail}
            </p>
          </div>
          <p
            className={`${hand.className} text-primary mt-8 text-4xl leading-8 font-bold`}
          >
            {STORY.signOff}
          </p>
        </div>
      </article>
    </Frame>
  );
}
