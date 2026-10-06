/**
 * The colours everyone starts from.
 *
 * Eight, so the row fits a phone without scrolling and reaches as far as the
 * canvas: the colours most drawings are made of, in rainbow order after black
 * and white, white included for drawing over colour. A short curated row is
 * what stops amateur drawings looking muddy (issue #39); anything else is one
 * tap away through the colour creator, and stays in Your colours.
 * Black comes first because it is the default brush colour.
 */
export const BASE_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
] as const;

/**
 * How many of your own colours to keep within reach.
 *
 * Six, so with the colour creator and the colour picker beside them they fill
 * the same eight-wide row as the defaults. The row is there to get back to a colour you mixed,
 * and a longer one stops being that: it becomes a second palette to read.
 */
export const RECENT_LIMIT = 6;

function isBaseColor(color: string): boolean {
  return BASE_COLORS.some((option) => option.value === color);
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
 * Puts a colour at the front of "Your colours".
 *
 * Only colours you mixed yourself belong there: a default is already one tap
 * away in its own row, so picking one leaves the list as it is. Choosing a
 * colour already in the list moves it to the front rather than adding it
 * twice. Once it's full, the colour that drops off the end is the one used
 * longest ago, so re-picking a colour keeps it.
 */
export function withRecent(recents: string[], color: string): string[] {
  if (isBaseColor(color)) return recents;
  return [color, ...recents.filter((recent) => recent !== color)].slice(
    0,
    RECENT_LIMIT,
  );
}

/**
 * Reads the stored list, ignoring anything that isn't a colour, and any
 * default saved before the list held only mixed colours.
 */
export function parseRecents(stored: string | null): string[] {
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          /^#[0-9a-f]{6}$/i.test(value) &&
          !isBaseColor(value),
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

/** `#rrggbb` to its red, green and blue, each 0–255. */
export function hexToRgb(color: string): [number, number, number] {
  const value = Number.parseInt(color.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Red, green and blue back to `#rrggbb`. Each channel is rounded and kept to
 * 0–255, so a half-typed or out-of-range box still gives a real colour.
 */
export function rgbToHex([red, green, blue]: [number, number, number]): string {
  const part = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel || 0)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(red)}${part(green)}${part(blue)}`;
}
