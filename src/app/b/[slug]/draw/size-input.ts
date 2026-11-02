/**
 * Turns what was typed in the brush-size box into a size the slider could
 * have produced.
 *
 * Returns `null` while the text isn't a whole number yet (empty, a lone
 * "-", letters), so the caller leaves the current size alone until it is.
 * Anything valid is clamped to `min..max` and snapped to `step`, counted
 * from `min` like a native range input does.
 */
export function parseSizeInput(
  raw: string,
  min: number,
  max: number,
  step = 1,
): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const typed = Number(text);
  const snapped = min + Math.round((typed - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}
