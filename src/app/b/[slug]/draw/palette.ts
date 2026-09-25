/**
 * The colours everyone starts from.
 *
 * Six, so the row fits a phone without scrolling: the colours most drawings
 * are made of, white included for drawing over colour. A short curated row is
 * what stops amateur drawings looking muddy (issue #39); anything else is one
 * tap away through the hex field or the colour wheel, and stays in Recent.
 * Black comes first because it is the default brush colour.
 */
export const BASE_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
] as const;

/**
 * How many recent colours to keep within reach.
 *
 * Five, on one line beside its label at phone width. The row is there to get
 * back to a colour you just used, and a longer one stops being that — it
 * becomes a second palette to read, next to the curated one above it.
 */
export const RECENT_LIMIT = 5;

function toRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([red, green, blue]: [number, number, number]): string {
  const part = (channel: number) =>
    Math.round(Math.min(Math.max(channel, 0), 255))
      .toString(16)
      .padStart(2, "0");
  return `#${part(red)}${part(green)}${part(blue)}`;
}

/** Moves a colour `amount` of the way towards another. */
function mix(from: string, towards: string, amount: number): string {
  const a = toRgb(from);
  const b = toRgb(towards);
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
}

/**
 * Five versions of a colour, darkest first, with the original in the middle.
 *
 * Mixing towards black and white rather than nudging lightness keeps the
 * colour recognisably itself: a lighter red still reads as red, where a
 * lightness shift can drift somewhere pink and surprising.
 *
 * White is the exception: nothing is lighter than it, so its two lighter
 * shades would just be white again — a row with the same swatch three times.
 * It gets four greys stepping down to it instead, with white at the light end.
 */
export function shadesOf(color: string): string[] {
  const base = color.toLowerCase();
  const lighter = [mix(base, "#ffffff", 0.3), mix(base, "#ffffff", 0.55)];

  if (lighter.includes(base)) {
    return [
      mix(base, "#000000", 0.8),
      mix(base, "#000000", 0.6),
      mix(base, "#000000", 0.4),
      mix(base, "#000000", 0.2),
      base,
    ];
  }

  return [
    mix(base, "#000000", 0.4),
    mix(base, "#000000", 0.2),
    base,
    ...lighter,
  ];
}

/**
 * Reads what someone typed into the hex field.
 *
 * Keeps only hex digits, so a pasted `#FF8800` works as well as a typed
 * `ff8800`, and stops at six. The colour is returned once all six are there,
 * lowercased to match everything else in the palette; until then only the
 * partial draft comes back, so half-typed values never become colours.
 */
export function parseHexInput(raw: string): {
  draft: string;
  color: string | null;
} {
  const draft = raw.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  return {
    draft,
    color: draft.length === 6 ? `#${draft.toLowerCase()}` : null,
  };
}

/**
 * Puts a colour at the front of the recent list.
 *
 * Choosing a colour already in the list moves it to the front rather than
 * adding it twice, so the row stays the last few distinct colours used. Once
 * it is full the colour that drops off the end is the one used longest ago —
 * re-picking a colour keeps it alive.
 */
export function withRecent(recents: string[], color: string): string[] {
  return [color, ...recents.filter((recent) => recent !== color)].slice(
    0,
    RECENT_LIMIT,
  );
}

/** Reads the stored recents, ignoring anything that isn't a colour. */
export function parseRecents(stored: string | null): string[] {
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is string =>
          typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value),
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}
