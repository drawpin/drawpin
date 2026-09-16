import sharp from "sharp";

export const TILE_SIZE = 768;

/** Largest upload accepted before decoding, well above a real drawing. */
export const MAX_UPLOAD_BYTES = 1_500_000;

const ACCEPTED_FORMATS = new Set(["png", "webp", "jpeg"]);

// A canvas with no strokes is a flat colour; allow a little noise from
// anti-aliasing or lossy re-encoding before calling it blank.
const BLANK_MAX_DEVIATION = 1;

export class InvalidTileImageError extends Error {
  constructor(message = "The upload isn't a supported image.") {
    super(message);
    this.name = "InvalidTileImageError";
  }
}

export class BlankTileImageError extends Error {
  constructor() {
    super("The drawing is blank.");
    this.name = "BlankTileImageError";
  }
}

/**
 * Turns an uploaded drawing into the stored tile image: a square
 * {@link TILE_SIZE}px WebP on a white background, with metadata stripped.
 *
 * Done on the server rather than in the browser because not every browser can
 * export a canvas as WebP (some Safari versions silently return PNG), and
 * because decoding here proves the upload really is an image.
 *
 * @throws {InvalidTileImageError} If the upload is too large, not an image, or
 * an unsupported format.
 * @throws {BlankTileImageError} If the drawing has nothing on it.
 */
export async function processTileImage(upload: Uint8Array): Promise<Buffer> {
  if (upload.byteLength === 0 || upload.byteLength > MAX_UPLOAD_BYTES) {
    throw new InvalidTileImageError("The drawing is too large.");
  }

  // Refuse absurd dimensions before decoding, so a tiny file that claims to
  // be enormous can't exhaust memory.
  const decoder = () =>
    sharp(upload, { limitInputPixels: 4096 * 4096, failOn: "error" });

  let format: string | undefined;
  try {
    format = (await decoder().metadata()).format;
  } catch {
    throw new InvalidTileImageError();
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new InvalidTileImageError();
  }

  try {
    const normalized = decoder()
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(TILE_SIZE, TILE_SIZE, { fit: "cover" });

    const { channels } = await normalized.clone().stats();
    if (channels.every((channel) => channel.stdev <= BLANK_MAX_DEVIATION)) {
      throw new BlankTileImageError();
    }

    return await normalized.webp({ quality: 85 }).toBuffer();
  } catch (error) {
    if (error instanceof BlankTileImageError) throw error;
    throw new InvalidTileImageError();
  }
}
