/**
 * A drawing-aware nudity check that runs alongside OpenAI's image moderation
 * (docs/PLAN.md, Moderation). Standard NSFW classifiers, OpenAI's included,
 * are trained on photos; DrawPin's tiles are hand-drawn line art from a
 * canvas, a different distribution photo classifiers are known to
 * underperform on.
 *
 * This uses NSFWJS's MobileNetV2 model, whose five classes (Drawing,
 * Hentai, Neutral, Porn, Sexy) were trained specifically to tell safe line
 * art apart from explicit content — including drawn/animated nudity
 * ("Hentai"), not just photographic nudity ("Porn"). It runs entirely
 * in-process on `@tensorflow/tfjs`'s WASM backend: no native bindings (so
 * no Vercel serverless build/deploy risk, unlike `@tensorflow/tfjs-node`)
 * and no image leaves the server.
 *
 * This is a *second opinion*, not the moderation gate: OpenAI's check is
 * required and fails closed (docs/PLAN.md — moderation being unreachable
 * refuses the post). This one is new, self-hosted, and unproven in
 * production, so a failure here (model load, decode, inference) is logged
 * and treated as "not flagged" rather than refusing the post — see
 * {@link classifyDrawing}.
 */
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import sharp from "sharp";
// Imported from nsfwjs's `core` and `models/mobilenet_v2` subpaths, not its
// top-level `nsfwjs.load()` — that pulls in every bundled model (MobileNetV2,
// MobileNetV2Mid and InceptionV3; ~38MB combined) because it imports all
// three unconditionally. This traces only MobileNetV2's ~3.5MB into the
// build. See https://github.com/infinitered/nsfwjs?tab=readme-ov-file#nodejs.
import { load as loadNsfwModel, type NSFWJS } from "nsfwjs/core";
import { MobileNetV2Model } from "nsfwjs/models/mobilenet_v2";

/** What NSFWJS's MobileNetV2 model expects. */
const MODEL_INPUT_SIZE = 224;

/**
 * Explicit-nudity classes. "Sexy" (e.g. swimwear, suggestive but not
 * explicit) and "Drawing"/"Neutral" are deliberately not auto-blocked —
 * this targets the specific nudity gap that was reported, not a general
 * decency filter.
 */
const NUDITY_CLASSES = new Set(["Porn", "Hentai"]);

/**
 * Combined probability across {@link NUDITY_CLASSES} above which a drawing
 * is flagged. There's no labeled DrawPin data to tune this against yet;
 * revisit once reported/removed tiles give a real signal.
 */
const FLAG_THRESHOLD = 0.7;

let modelPromise: Promise<NSFWJS> | null = null;

/** Loads the model once per process and reuses it for every later call. */
function loadModel(): Promise<NSFWJS> {
  modelPromise ??= tf
    .setBackend("wasm")
    .then(() => tf.ready())
    .then(() =>
      loadNsfwModel("MobileNetV2", { modelDefinitions: [MobileNetV2Model] }),
    );
  return modelPromise;
}

export type DrawingNsfwVerdict = {
  flagged: boolean;
  /** The signal that decided this, for the server log only — never shown
   * to visitors. */
  label: string;
};

type Prediction = { className: string; probability: number };

/**
 * Applies {@link FLAG_THRESHOLD} to a set of model predictions. Separated
 * from {@link classifyDrawing} so the threshold logic can be unit-tested
 * against made-up predictions — there's no real explicit image in this
 * repository to classify, nor should there be.
 */
export function decideFromPredictions(
  predictions: Prediction[],
): DrawingNsfwVerdict {
  const nudity = predictions
    .filter((prediction) => NUDITY_CLASSES.has(prediction.className))
    .reduce((sum, prediction) => sum + prediction.probability, 0);

  if (nudity >= FLAG_THRESHOLD) {
    return { flagged: true, label: `nudity:${nudity.toFixed(2)}` };
  }
  const top = predictions.reduce((best, prediction) =>
    prediction.probability > best.probability ? prediction : best,
  );
  return {
    flagged: false,
    label: `${top.className}:${top.probability.toFixed(2)}`,
  };
}

/**
 * Classifies a tile's image for drawn or animated nudity.
 *
 * @param image - The processed tile image (see `tile-image.ts`): a square
 * WebP already flattened onto a white background, so it can be resized and
 * read as opaque RGB directly.
 *
 * Never rejects for a moderation-relevant reason: any failure resolves to
 * `{ flagged: false, label: "error" }` (see the module doc for why).
 */
export async function classifyDrawing(
  image: Buffer,
): Promise<DrawingNsfwVerdict> {
  try {
    const model = await loadModel();
    const { data } = await sharp(image)
      .resize(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = tf.tensor3d(
      new Uint8Array(data),
      [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3],
      "int32",
    );
    try {
      const predictions = await model.classify(tensor);
      return decideFromPredictions(predictions);
    } finally {
      tensor.dispose();
    }
  } catch (error) {
    console.error(
      "NSFW drawing check failed; treating the drawing as not flagged",
      error,
    );
    return { flagged: false, label: "error" };
  }
}
