// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  backingSizeFor,
  clampView,
  MAX_ZOOM,
  screenToTile,
  sprayDots,
  TILE_SIZE,
  WHOLE_TILE,
  zoomAround,
} from "./render";

describe("backingSizeFor", () => {
  it("matches the device's pixels on a phone", () => {
    // An iPhone at 390px wide shows the canvas at 343 CSS px on a 3× screen.
    expect(backingSizeFor(343, 3)).toBe(1029);
  });

  it("never goes below tile size, however small the canvas is drawn", () => {
    // The export is 768 either way, so a smaller buffer would only throw
    // away detail the visitor drew.
    expect(backingSizeFor(200, 1)).toBe(TILE_SIZE);
    expect(backingSizeFor(343, 1)).toBe(TILE_SIZE);
  });

  it("caps the density, so a 4× display doesn't allocate absurdly", () => {
    expect(backingSizeFor(500, 4)).toBe(backingSizeFor(500, 3));
  });

  it("treats a missing or nonsense ratio as 1×", () => {
    expect(backingSizeFor(1000, 0)).toBe(1000);
    expect(backingSizeFor(1000, 0.5)).toBe(1000);
  });

  it("rounds to whole pixels", () => {
    expect(Number.isInteger(backingSizeFor(343.7, 2.625))).toBe(true);
  });
});

describe("clampView", () => {
  it("won't zoom further out than the whole tile", () => {
    expect(clampView({ scale: 0.2, offsetX: 0, offsetY: 0 }).scale).toBe(1);
  });

  it("won't zoom past the limit", () => {
    expect(clampView({ scale: 99, offsetX: 0, offsetY: 0 }).scale).toBe(
      MAX_ZOOM,
    );
  });

  it("keeps the drawing on screen", () => {
    // At 2× half the tile is visible, so the furthest the corner can go is
    // halfway across it.
    const view = clampView({ scale: 2, offsetX: 9999, offsetY: -50 });

    expect(view.offsetX).toBe(TILE_SIZE / 2);
    expect(view.offsetY).toBe(0);
  });
});

describe("screenToTile", () => {
  it("maps the whole canvas to the whole tile when zoomed out", () => {
    expect(screenToTile(WHOLE_TILE, 0, 0, 343)).toEqual([0, 0]);
    expect(screenToTile(WHOLE_TILE, 343, 343, 343)).toEqual([
      TILE_SIZE,
      TILE_SIZE,
    ]);
  });

  it("maps into the visible part when zoomed in", () => {
    const view = { scale: 2, offsetX: 384, offsetY: 0 };

    // The left edge of the screen is now the middle of the tile.
    expect(screenToTile(view, 0, 0, 343)).toEqual([384, 0]);
    expect(screenToTile(view, 343, 0, 343)[0]).toBe(TILE_SIZE);
  });
});

describe("zoomAround", () => {
  it("holds the anchored point still", () => {
    const before = screenToTile(WHOLE_TILE, 100, 200, 343);
    const zoomed = zoomAround(WHOLE_TILE, 3, 100, 200, 343);
    const after = screenToTile(zoomed, 100, 200, 343);

    expect(after[0]).toBeCloseTo(before[0], 5);
    expect(after[1]).toBeCloseTo(before[1], 5);
  });

  it("stays within the tile when anchored near an edge", () => {
    const zoomed = zoomAround(WHOLE_TILE, 4, 0, 0, 343);

    expect(zoomed.offsetX).toBe(0);
    expect(zoomed.offsetY).toBe(0);
  });

  it("returns to the whole tile when zoomed all the way out", () => {
    const zoomed = zoomAround(WHOLE_TILE, 4, 200, 200, 343);
    const back = zoomAround(zoomed, 1, 200, 200, 343);

    expect(back).toEqual(WHOLE_TILE);
  });
});

describe("sprayDots", () => {
  const line: [number, number, number][] = [
    [100, 100, 0.5],
    [300, 100, 0.5],
  ];

  it("puts the same dots in the same places for the same stroke", () => {
    // Drawings are re-rendered on every frame, every undo and every zoom; a
    // spray that scattered differently each time would shimmer.
    expect(sprayDots(line, 20, 42)).toEqual(sprayDots(line, 20, 42));
  });

  it("scatters differently for a different stroke", () => {
    expect(sprayDots(line, 20, 42)).not.toEqual(sprayDots(line, 20, 43));
  });

  it("keeps every dot within the brush's reach of the line", () => {
    const dots = sprayDots(line, 40, 7);

    for (const dot of dots) {
      // The line runs along y = 100 between x = 100 and x = 300.
      const nearestX = Math.min(Math.max(dot.x, 100), 300);
      expect(Math.hypot(dot.x - nearestX, dot.y - 100)).toBeLessThanOrEqual(20);
    }
  });

  it("costs about the same per pixel however long the stroke is", () => {
    const short = sprayDots(
      [
        [0, 0, 0.5],
        [100, 0, 0.5],
      ],
      20,
      1,
    );
    const long = sprayDots(
      [
        [0, 0, 0.5],
        [400, 0, 0.5],
      ],
      20,
      1,
    );

    // Four times the length, roughly four times the dots — not sixteen.
    expect(long.length / short.length).toBeGreaterThan(3);
    expect(long.length / short.length).toBeLessThan(5);
  });

  it("thins out as the brush grows, so a fat spray isn't thousands of dots", () => {
    const fine = sprayDots(line, 8, 3).length;
    const fat = sprayDots(line, 64, 3).length;

    expect(fat).toBeLessThan(fine);
  });

  it("still marks the paper on a single tap", () => {
    expect(sprayDots([[50, 50, 0.5]], 20, 5).length).toBeGreaterThan(0);
  });
});
