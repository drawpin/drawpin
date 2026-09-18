-- Week status is worked out from the clock now, not stored
-- (docs/adr/003-on-demand-venue-time-transitions.md, issue #27).
--
-- Nothing ran at 4:00 AM in each venue's time zone to move a week from posting
-- to voting to closed, so every row sat at 'posting' for ever and the board
-- kept showing last week's tiles after a rollover. `starts_at`,
-- `posting_ends_at` and `voting_ends_at` already say everything the status did.
alter table weeks drop column status;

drop type week_status;

-- Same reason: nothing ever set it. The cleanup job (#31) works from
-- `voting_ends_at` instead.
alter table weeks drop column purge_after;
