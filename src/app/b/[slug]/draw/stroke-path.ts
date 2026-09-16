/**
 * Converts the outline points from `perfect-freehand`'s `getStroke` into an
 * SVG path string, using quadratic curves through the midpoints for a smooth
 * edge. Adapted from the perfect-freehand README.
 *
 * @returns A closed path, or `""` if there are no points.
 */
export function strokeToSvgPath(outline: number[][]): string {
  if (outline.length === 0) return "";

  const path = outline.reduce<(string | number)[]>(
    (segments, [x0, y0], i, points) => {
      const [x1, y1] = points[(i + 1) % points.length];
      segments.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return segments;
    },
    ["M", ...outline[0], "Q"],
  );

  path.push("Z");
  return path.join(" ");
}
