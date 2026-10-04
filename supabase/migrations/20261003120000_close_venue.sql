-- Closing a board (ADR-009): everything on it goes, Hall of Fame included.
--
-- Almost everything already cascades from venues. The exception is the Hall
-- of Fame: hall_of_fame.tile_id is ON DELETE RESTRICT, so the 30-day purge
-- can never delete a winning tile, and that would stop the cascade from
-- removing tiles. So its rows go first, then the owner row, which cascades
-- to the venue and from there to everything else. One transaction: a board
-- is either fully there or fully gone.
--
-- Images live in Storage and the owner's login in Auth; the app deletes
-- those (src/app/admin/close-board.ts).
create function public.close_venue(p_venue_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from venues where id = p_venue_id for update;
  if not found then
    raise exception 'venue % not found', p_venue_id
      using errcode = 'no_data_found';
  end if;

  delete from hall_of_fame where venue_id = p_venue_id;
  delete from owners where id = v_owner_id;
end;
$$;

revoke all on function public.close_venue(uuid) from public;
grant execute on function public.close_venue(uuid) to service_role;

notify pgrst, 'reload schema';
