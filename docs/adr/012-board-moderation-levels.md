# ADR-012: Each Board Picks a Moderation Level

## Status

Accepted (2026-10-06). Brings per-board moderation strictness out of
docs/PLAN.md's back pocket (PLAN v16). The current policy, ADR-005 and
ADR-006, becomes the default level, All Ages, unchanged.

## Context

Every board gets the same moderation. Its rules were written for a board
that may be up in a restaurant or a classroom (ADR-006):

- The built-in profanity list (`profanity-terms.ts`) blocks every entry of
  severity 3 or more, whatever its tag: slurs, sexual terms and plain
  swearing alike. Site-wide extra terms from `MODERATION_BLOCKLIST`, and
  links, email addresses and phone numbers, are blocked too.
- OpenAI's moderation (`omni-moderation-latest`) blocks every category it
  flags: hate, harassment, sexual, violence, self-harm, illicit.
- NSFWJS (ADR-005) blocks drawn nudity, though not its "Sexy" class.
- `gpt-4.1-mini` (ADR-006) reads every drawing for written words, hate
  symbols and sexual content, and the words it reads go through the
  blocklist.

That suits a family restaurant. It doesn't suit every group that uses
DrawPin: a group chat or a late-night party gets a swear word or a
cartoon of blood refused, with no way to loosen it. The plan kept
per-board strictness in its back pocket until there was feedback from more
than one board; the owner chose to bring it forward now, before boards
beyond the first are invited, so each can be set up the way it means to run.

## Decision

The owner picks one of three levels at setup, with All Ages preselected,
and can change it later from the owner admin. It's stored on the board as
`venues.moderation_level`: `all_ages`, `standard` or `late_night`, default
`all_ages`.

|                                                          | All Ages (default) | Standard | Late Night          |
| -------------------------------------------------------- | ------------------ | -------- | ------------------- |
| Swearing, in captions and words read from drawings       | blocked            | allowed  | allowed             |
| Violence, gore, self-harm, illicit (OpenAI)              | blocked            | allowed  | allowed             |
| Nudity and sexual content, including sexual terms        | blocked            | blocked  | allowed             |
| Slurs, hate symbols, hate and harassment (OpenAI)        | blocked            | blocked  | allowed             |
| Links, email addresses, phone numbers                    | blocked            | blocked  | allowed             |
| Site-wide extra terms (`MODERATION_BLOCKLIST`)           | blocked            | blocked  | allowed             |
| Sexual content involving minors (OpenAI `sexual/minors`) | blocked            | blocked  | **blocked, always** |

How the owner sees them:

- **All Ages:** best for family spots and businesses. Full moderation,
  blocking anything suggestive, crude or violent. Exactly today's rules.
- **Standard:** allows swearing, violence and gore.
- **Late Night:** no moderation.

### How the levels map onto the checks

- **Built-in profanity terms** are filtered by tag, using the categories
  they already carry (`categoryForTags`). Racial, lgbtq and religious terms
  are hateful and follow the slurs row. Sexual terms follow the sexual row.
  The rest is swearing.
- **OpenAI categories** map the same way: hate and harassment follow the
  slurs row, sexual the sexual row, and violence, self-harm and illicit the
  violence row.
- **NSFWJS and the vision model's sexual verdict** follow the sexual row.
  Its hateful verdict and hate symbols follow the slurs row.
- **Late Night skips the vision call** and NSFWJS. It still sends the post
  to OpenAI's moderation, for `sexual/minors` alone. If OpenAI can't be
  reached, the post is refused as it is today: the floor fails closed too.
- Politics isn't checked on any level.

### The legal floor

Sexual content involving minors is blocked on every level. That isn't a
taste the owner gets to set: hosting it is illegal, and it breaks
Supabase's and Vercel's terms. The owner's Remove tile and a visitor's
Report work on every level as well.

### What the level covers

Only the drawings and captions posted on that board. A username is
account-wide and shows on every board, and a board's name shows in link
previews, titles and its URL, so both are always checked at All Ages,
whatever the board's level.

### Changing it

A change applies to new posts only. Drawings already on the board stay,
and nothing is checked again. The owner can still remove any of them.

### What visitors are told

- No badge on the board itself.
- A quiet "Board rules" link in the board footer, on every level, says
  what the level allows.
- On Standard and Late Night, the draw screen's small print says so too.
- Late Night shows a one-time "this board isn't moderated, continue?"
  screen before the board, remembered per device.

### Order of work

1. This ADR and PLAN v16.
2. The `moderation_level` column, docs/ERD.md and schema tests.
3. Level-aware moderation: `moderateTile` takes a level, and a policy
   decides which categories block. The private eval set gets expectations
   per level.
4. The level at setup, its card in the owner admin, and the draw action
   passing the board's level.
5. The Board rules link and page, the Late Night warning, and the Terms
   copy.

## Alternatives considered

- **Finer controls**, a toggle per category or a strictness slider.
  Rejected: the owner admin is kept to the bare minimum, and three named
  levels are a choice anyone can make in a few seconds at setup.
- **No floor on Late Night.** Rejected: the floor is a legal requirement,
  not a moderation preference.
- **Re-checking existing drawings when the level changes.** Rejected: it
  would delete drawings people posted in good faith under the old rules,
  and the owner can already remove any single drawing.

## Consequences

- The Terms page promises that nothing illegal, hateful, sexual or violent
  is posted, nor links or contact details. Step 5 rewrites it to say that
  each board's owner picks its rules, with the floor and illegal content
  ruled out everywhere. `.env.example` says links are always blocked; that
  changes with step 3.
- The eval gate (ADR-006) runs per level. The ship gate for step 3 is that
  All Ages still catches everything it catches today, on three runs in a
  row.
- Late Night boards skip the vision call, so their posts cost nothing
  beyond OpenAI's free moderation endpoint.
- Accepted risk: a Late Night board can be reached by scanning a QR code
  that someone didn't expect to lead there. The one-time warning, the
  Board rules link, Report and Remove tile are what stand between that
  visitor and the board.
- Owners now decide what their board hosts. The Terms still forbid
  anything illegal on every board, and the floor still applies, whatever
  the level.
