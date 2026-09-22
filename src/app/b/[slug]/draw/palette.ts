/**
 * The colours everyone starts from.
 *
 * Deliberately few and deliberately chosen: a curated palette is what stops
 * amateur drawings looking muddy, which matters more here than freedom does
 * (issue #39). Anyone who wants an exact colour can still reach the phone's
 * own picker.
 */
export const BASE_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Brown", value: "#92400e" },
] as const;

/** How many recent colours to keep within reach. */
export const RECENT_LIMIT = 6;

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
 */
export function shadesOf(color: string): string[] {
  return [
    mix(color, "#000000", 0.4),
    mix(color, "#000000", 0.2),
    color,
    mix(color, "#ffffff", 0.3),
    mix(color, "#ffffff", 0.55),
  ];
}

/**
 * Puts a colour at the front of the recent list.
 *
 * Choosing a colour already in the list moves it to the front rather than
 * adding it twice, so the row stays the last few distinct colours used.
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
