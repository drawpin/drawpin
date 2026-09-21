/** Just the parts of `ImageData` a fill needs, so this is testable anywhere. */
export type Pixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

/**
 * The area a fill covers: one byte per pixel, 1 for filled, over a box rather
 * than the whole tile. Most fills cover part of a drawing, and keeping the
 * whole 768 square for each one adds up.
 */
export type FillRegion = {
  pixels: Uint8Array;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * How different a pixel may be from where the bucket was tapped and still
 * count as the same area. Strokes are drawn with smoothed edges, so an exact
 * match would stop dead at the first half-shaded pixel and leave a halo.
 */
const TOLERANCE = 48;

function matches(
  data: Uint8ClampedArray,
  index: number,
  target: [number, number, number, number],
): boolean {
  return (
    Math.abs(data[index] - target[0]) <= TOLERANCE &&
    Math.abs(data[index + 1] - target[1]) <= TOLERANCE &&
    Math.abs(data[index + 2] - target[2]) <= TOLERANCE &&
    Math.abs(data[index + 3] - target[3]) <= TOLERANCE
  );
}

/**
 * Works out which pixels a bucket tap should colour in.
 *
 * A scanline flood fill: it spreads from the tap across everything of roughly
 * the same colour, and stops at anything that isn't. A gap in an outline lets
 * it through and it floods the lot — which is how every paint program behaves,
 * and why undo exists (docs, issue #39).
 *
 * @returns The area to fill, or `null` if the tap was outside the image.
 */
export function floodFill(
  image: Pixels,
  startX: number,
  startY: number,
): FillRegion | null {
  const { data, width, height } = image;
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return null;

  const seedIndex = (y0 * width + x0) * 4;
  const target: [number, number, number, number] = [
    data[seedIndex],
    data[seedIndex + 1],
    data[seedIndex + 2],
    data[seedIndex + 3],
  ];

  const filled = new Uint8Array(width * height);
  const stack: number[] = [x0, y0];
  let minX = x0;
  let maxX = x0;
  let minY = y0;
  let maxY = y0;

  while (stack.length > 0) {
    const y = stack.pop()!;
    const seedX = stack.pop()!;
    if (filled[y * width + seedX]) continue;

    // Run left and right from the seed, then look one row up and down along
    // the whole run: far fewer stack entries than pushing every neighbour.
    let left = seedX;
    while (left > 0 && !filled[y * width + left - 1]) {
      if (!matches(data, (y * width + left - 1) * 4, target)) break;
      left--;
    }

    let right = seedX;
    while (right < width - 1 && !filled[y * width + right + 1]) {
      if (!matches(data, (y * width + right + 1) * 4, target)) break;
      right++;
    }

    for (let x = left; x <= right; x++) {
      filled[y * width + x] = 1;

      for (const neighbourY of [y - 1, y + 1]) {
        if (neighbourY < 0 || neighbourY >= height) continue;
        const index = neighbourY * width + x;
        if (!filled[index] && matches(data, index * 4, target)) {
          stack.push(x, neighbourY);
        }
      }
    }

    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Grown by a pixel so the fill tucks under the smoothed edge of a stroke
  // instead of leaving a pale outline around everything.
  const boxX = Math.max(minX - 1, 0);
  const boxY = Math.max(minY - 1, 0);
  const boxWidth = Math.min(maxX + 1, width - 1) - boxX + 1;
  const boxHeight = Math.min(maxY + 1, height - 1) - boxY + 1;
  const region = new Uint8Array(boxWidth * boxHeight);

  for (let y = 0; y < boxHeight; y++) {
    for (let x = 0; x < boxWidth; x++) {
      const imageX = boxX + x;
      const imageY = boxY + y;
      if (filled[imageY * width + imageX]) {
        region[y * boxWidth + x] = 1;
        continue;
      }
      // Dilation: a pixel next to a filled one joins it.
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = imageX + dx;
        const ny = imageY + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (filled[ny * width + nx]) {
          region[y * boxWidth + x] = 1;
          break;
        }
      }
    }
  }

  return {
    pixels: region,
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
  };
}
