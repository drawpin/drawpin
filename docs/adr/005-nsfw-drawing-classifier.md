# ADR-005: A Second, Drawing-Aware Nudity Check Alongside OpenAI

## Status
Accepted

## Context
OpenAI's moderation endpoint (`docs/PLAN.md`, Moderation) is the required
check for every tile: it fails closed, refusing a post rather than
publishing it unchecked. It was reported letting nudity through on drawn
tiles on the live board.

DrawPin's images aren't photos — they're hand-drawn line art from a canvas
(`perfect-freehand`). General-purpose NSFW image classifiers, almost
certainly including whatever OpenAI's vision moderation is trained on, are
trained on photographs and are known to underperform on that different
distribution: a crude drawing of nudity doesn't look like a nude photo to a
model that's only ever seen photos.

## Decision
Run a second, drawing-aware nudity check (`src/lib/moderation/
nsfw-drawing.ts`) alongside OpenAI's, using [NSFWJS](https://github.com/
infinitered/nsfwjs)'s MobileNetV2 model. Its five classes — Drawing, Hentai,
Neutral, Porn, Sexy — were trained specifically to tell safe line art apart
from explicit content, including drawn/animated nudity ("Hentai"), not just
photographic nudity ("Porn"). A tile is blocked if `Porn + Hentai`
probability clears a threshold (`FLAG_THRESHOLD`, currently 0.75); `Sexy`
(e.g. swimwear, suggestive-but-not-explicit) is deliberately not
auto-blocked, to avoid false-positiving ordinary drawings.

It runs in-process on `@tensorflow/tfjs`'s **WASM** backend, not
`@tensorflow/tfjs-node`: `tfjs-node` needs a native compiled binary, which is
a real risk on Vercel's serverless functions (unlike `sharp`, which is
already proven to work there, `tfjs-node` isn't something this project has
verified support for). The WASM backend has no native bindings, so it runs
anywhere Node does, and it classifies a tile in well under 100ms once the
model is loaded (warm).

It's treated as a **second opinion, not a gate**: any failure (model load,
image decode, inference) is caught and resolved as "not flagged" rather than
refusing the post. This is new, self-hosted, and unproven in production;
OpenAI's check remains the one that fails closed. A bug in a brand-new,
supplementary ML pipeline shouldn't be able to take down posting entirely.

### Bundle size
`nsfwjs`'s top-level `nsfwjs.load()` pulls in all three of its bundled
models (MobileNetV2, MobileNetV2Mid, InceptionV3 — about 38 MB combined),
because it imports all three unconditionally to build its model registry.
`nsfw-drawing.ts` instead imports `nsfwjs/core` and `nsfwjs/models/
mobilenet_v2` directly (subpaths the package exports for exactly this),
which traces only MobileNetV2's ~3.5 MB.

Separately, `@tensorflow/tfjs-backend-wasm` locates its `.wasm` binary at
runtime via a `__dirname + filename` path that Turbopack's output-file
tracing doesn't follow — the file was silently missing from the built
`/b/[slug]/draw` function until `nsfwjs` and `@tensorflow/tfjs-backend-wasm`
were added to `serverExternalPackages` in `next.config.ts`, which keeps them
unbundled so their own files (including the `.wasm`) ship as plain
`node_modules` rather than being traced/inlined. Confirmed by inspecting the
built function's `.nft.json` file list after `npm run build`.

## Alternatives considered
- **A hosted third-party classifier API** (Hugging Face Inference API, a
  vision moderation vendor). Rejected: another vendor and API key for a
  second opinion, extra network latency and a failure mode (the vendor being
  down) on every post, and no clear accuracy advantage over a model trained
  to specifically separate "Drawing" from "Hentai"/"Porn".
- **`@tensorflow/tfjs-node`** (native bindings, faster than WASM). Rejected:
  unverified on Vercel's serverless runtime, and the risk of a broken
  production deploy over a supplementary check isn't worth the speed gain —
  classification is already well under 100ms warm on WASM.

## Consequences
- `~3.5 MB` added to the `/b/[slug]/draw` function's deployment size for the
  model weights, plus `@tensorflow/tfjs` and its WASM binaries.
- The model is loaded once per warm serverless instance and reused; the
  **first** post handled by a cold instance pays a one-time load cost
  (roughly 1–3 seconds locally; not yet measured on Vercel). Because it runs
  concurrently with the OpenAI call rather than after it, this doesn't add
  to every request — only cold ones, and only up to whichever check is
  slower.
- `FLAG_THRESHOLD` has no DrawPin-specific data behind it yet. It should be
  revisited once reported/removed tiles give a real signal — see the `nsfw-
  drawing:<label>` reason logged for a blocked post, and the "Neutral"/
  "Drawing"-labeled near-misses that weren't blocked.
- Any future model swap (a different drawing-aware classifier, a higher-
  resolution model) only touches `nsfw-drawing.ts`; `moderate-tile.ts` just
  calls `classifyDrawing` and reads back `{ flagged, label }`.
