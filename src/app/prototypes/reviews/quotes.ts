/**
 * One quote from each kind of group. PLACEHOLDERS (2026-10-05): the owner is
 * sending the real statements from people using DrawPin; swap them in here.
 */
export type Quote = {
  place: "Restaurant" | "Office" | "Friends";
  /** Who said it, as they'd put it. */
  who: string;
  text: string;
  /** A drawing from their board. */
  drawing: string;
  /** The pin colour. */
  pin: "#004aad" | "#ffca39" | "#ff821b" | "#6badfa";
};

export const QUOTES: Quote[] = [
  {
    place: "Restaurant",
    who: "Owner, a neighbourhood café",
    text: "Regulars check the board before they order now. The kids argue over who gets to draw while the food comes.",
    drawing: "/examples/latte.webp",
    pin: "#ff821b",
  },
  {
    place: "Office",
    who: "Team lead, a design studio",
    text: "It became our Friday thing. Somebody always draws the boss, and somebody always votes for it.",
    drawing: "/examples/skyline.webp",
    pin: "#004aad",
  },
  {
    place: "Friends",
    who: "A group chat of nine",
    text: "Our chat was quiet for months. Now there's a new drawing every morning and a lot of arguing on Sundays.",
    drawing: "/examples/dog.webp",
    pin: "#ffca39",
  },
];
