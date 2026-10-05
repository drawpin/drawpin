-- Deleting a customer's account (docs/PLAN.md, Accounts).
--
-- Their tiles go, except winners: a weekly winner or monthly super winner is
-- the board's history as much as theirs, so it stays in the Hall of Fame
-- with the name taken off. Votes, final votes, reports, blocks and daily
-- post records cascade when the profile goes, which happens when the app
-- deletes the auth user afterwards.

-- The tiles a deleted account keeps: the ones the Hall of Fame shows.
create function public.account_winning_tile_ids(p_user_id uuid)
returns setof uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select t.id from tiles t
   where t.user_id = p_user_id
     and (
       exists (select 1 from hall_of_fame h where h.tile_id = t.id)
       or exists (select 1 from monthly_finals f where f.winner_tile_id = t.id)
     );
$$;

-- Removes an account's tiles and anonymises its winners, in one transaction.
-- The app deletes the images first (src/lib/delete-account.ts), so a
-- Storage failure leaves everything here untouched for another try.
create function public.delete_account_tiles(p_user_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update tiles
     set display_name = null, name_tag = null, user_id = null
   where id in (select account_winning_tile_ids(p_user_id));

  delete from tiles where user_id = p_user_id;
end;
$$;

revoke all on function public.account_winning_tile_ids(uuid) from public;
revoke all on function public.delete_account_tiles(uuid) from public;
grant execute on function public.account_winning_tile_ids(uuid) to service_role;
grant execute on function public.delete_account_tiles(uuid) to service_role;

notify pgrst, 'reload schema';
