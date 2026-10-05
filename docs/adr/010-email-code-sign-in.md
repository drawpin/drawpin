# ADR-010: Customers Can Sign In With an Emailed Code

## Status
Accepted. Adds to ADR-004 (Google was the only way in for customers) and
`docs/PLAN.md` v13.

## Context
Since ADR-007, posting, voting and reporting need an account, and the only
customer sign-in was Google. "Go make a Google account first" is where
people give up, and #41 already put working email (Resend, as
`hello@drawpin.io`) in place, so an emailed sign-in needs no new provider,
consent screen or review.

Most people arrive by scanning a QR code, which often opens an in-app
browser (Instagram, Snapchat, a camera app). A magic link tapped in an email
opens in a different browser, so the session lands somewhere the person
isn't. The owner login lives with that; a customer mid-drawing shouldn't.

## Decision
- **A code, typed on the page they're on.** Under every "Sign in with
  Google" button sits "No Google account? Get a code by email". They enter an
  address, pass Turnstile, get a code, type it, and are signed in on that
  device, so it works in any in-app browser.
- **The same Supabase OTP as the owner link**, verified as `type: "email"`.
  New addresses create the account, and `/welcome` asks for a username as it
  does after Google.
- **One email template for both.** It shows the code first and keeps the
  owner's link beneath it ("Running a board? Tap the link instead").
- **Any code length Supabase is set to** (6 to 10 digits): hosted projects
  default to 8, the local stack to 6.
- **An owner's address is refused** for customer sign-in, with a pointer to
  use another email or Google: an account is an owner or a customer, never
  both (ADR-004).
- **Abuse limits:** Turnstile before any email is sent, plus Supabase's own
  per-address and per-IP limits on sending and on verifying codes.

## Consequences
- Both Supabase projects need the template (`supabase/templates/magic_link.html`)
  pasted into **Magic Link** and **Confirm signup** in the dashboard: hosted
  projects don't read `config.toml`. Until then, emails carry only the link
  and the code step can't be completed.
- Email sign-in is as strong as the inbox. Someone can sign up with a
  throwaway address, as they can make a second Google account; the plan
  already accepts that risk.
- Sign-in emails go through Resend, so its sending limits now apply to
  customers too.
