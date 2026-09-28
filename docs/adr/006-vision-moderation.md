# ADR-006: A Vision Model Reads Every Drawing

## Status
Accepted

## Context
The first test board, shared with about 40 people, got drawings that every
existing check let through:

- hand-drawn slurs, including one spaced out and one inside a longer word;
- "NO GAY" written in pale pink;
- a swastika;
- an antisemitic caricature;
- a stick figure with genitals.

OpenAI's moderation endpoint labels a picture but doesn't transcribe the
words written in it, and it treats a crude doodle differently from the
photos it was trained on. NSFWJS (ADR-005) only looks for nudity. The
blocklist only sees the name and the caption.

Two ways to read the words in a drawing were considered:

- **OCR (Tesseract or similar).** It's free, but it's built for printed
  text. On finger-drawn letters it either reads nothing or reads noise, and
  it can't recognise symbols or judge a picture at all.
- **A vision language model.** It reads messy handwriting, recognises
  symbols and caricatures, and judges the caption and the drawing together.
  It costs money per post and its answers are less predictable.

## Decision
Every post with a drawing gets a fourth check, `src/lib/moderation/vision.ts`.
It asks `gpt-4.1-mini` for a structured verdict: the text written in the
drawing, any hate symbols, and whether it's hateful or sexual.

- **Model.** `gpt-4.1-mini` caught every harmful drawing on the test board.
  `gpt-4.1-nano` missed the swastika.
- **Cost.** About 940 input tokens and 30 output tokens, which is roughly
  $0.0005 a post, or 50 cents per thousand drawings. `detail: "high"` costs
  the same as `"low"` for this model at 768px, and low detail sometimes
  missed small details near the edge of the tile.
- **The text it reads also goes through the blocklist.** A slur is caught by
  DrawPin's own list even if the model doesn't flag it.
- **It runs in parallel** with OpenAI moderation and NSFWJS, so it adds
  about a second to posting, not a queue of checks.
- **It fails closed.** A timeout, an error or an unreadable answer, after
  one retry, refuses the post without using up the daily post, the same as
  when OpenAI's moderation endpoint is down (`docs/PLAN.md`, Moderation).
- **Anything borderline is blocked.** There's no "hold for review" state; an
  owner can still remove anything that gets through.
- **`temperature: 0`** so the same drawing gets the same answer each time.

### Policy
The board is treated as family-friendly, since it may be up in a restaurant
or a classroom. The policy lives in the model's instructions:

- **Hateful:** slurs, hate symbols, caricatures mocking a group, or messages
  demeaning people for who they are. A religious or national symbol on its
  own (a Star of David, a cross, a crescent, a flag) is not hateful.
- **Sexual:** genitals or a sexual act, however crude the drawing. Nudity
  without those, such as a drawn bare chest, is allowed.

### The blocked message
Every check now names a category: hateful, sexual, violent, contact or
language. The poster sees the category and how many tries they have left
(`blocked-message.ts`), but never the word or rule that matched, which would
teach them how to get around it.

### The eval gate
`npm run moderation:eval` runs a private set of drawings through the real
pipeline and fails if any of them is handled wrongly. The set includes the
test board's harmful tiles, look-alikes that must stay allowed (a pinwheel,
grapes, religious symbols, a bare chest), and contact details. The drawings
contain slurs and hate symbols, so they live in the git-ignored
`moderation-eval/` folder, never in this public repository, and the eval
isn't part of CI. It skips when the folder is missing.

A change to the model or its instructions doesn't ship unless the eval
passes on three runs in a row.

## Consequences
- Posting costs money for the first time. At the current price it's
  negligible, but it grows with use rather than being fixed.
- A drawing is sent to OpenAI's chat API as well as its moderation endpoint.
  The privacy page already says OpenAI checks every drawing.
- The model can still be wrong, and one that's right on the eval set can
  still be fooled by something new. The owner's Remove tile stays the
  backstop, and new misses get added to the eval set.
- Changing the policy means changing the instructions and re-running the
  eval, not changing code paths.
