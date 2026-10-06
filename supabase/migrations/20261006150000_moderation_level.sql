-- A board's moderation level (ADR-012).
--
-- all_ages is today's rules, so every existing board keeps the moderation it
-- has. standard allows swearing and violence; late_night turns moderation
-- off except for the legal floor. The app decides what each level blocks
-- (src/lib/moderation); the database only stores the owner's choice.
alter table venues
  add column moderation_level text not null default 'all_ages',
  add constraint venues_moderation_level_check check (
    moderation_level in ('all_ages', 'standard', 'late_night')
  );

comment on column venues.moderation_level is
  'What moderation the board''s posts get: all_ages, standard or late_night.';

-- Public, like timezone: board pages and the Board rules link show it.
-- Owners change it through the server with the service role, so no UPDATE.
grant select (moderation_level) on venues to anon, authenticated;

-- Have PostgREST pick up the new column and grant immediately.
notify pgrst, 'reload schema';
