/**
 * One quote from each kind of group, for the home page's "What people say".
 * The statements are the owner's, from people using DrawPin (2026-10-05),
 * lightly edited for grammar.
 */
export type Quote = {
  place: "Restaurant" | "Office" | "Friends";
  /** Who said it, as they'd put it; the note ends with it as its attribution. */
  who: string;
  text: string;
  /** The pin colour. */
  pin: "#004aad" | "#ffca39" | "#ff821b" | "#6badfa";
};

export const QUOTES: Quote[] = [
  {
    place: "Restaurant",
    who: "A local restaurant",
    text: "A lot of our regulars scan the board while they wait for their food, and groups finally have something to do together!",
    pin: "#ff821b",
  },
  {
    place: "Office",
    who: "An office team",
    text: "DrawPin became the office's daily talk! We draw every day (sometimes each other), have a good laugh, and love seeing who wins.",
    pin: "#004aad",
  },
  {
    place: "Friends",
    who: "A friend group",
    text: "This became our friend group's Wordle! There's a new drawing every morning, and the competitive talk starts as the votes rack up.",
    pin: "#ffca39",
  },
];
