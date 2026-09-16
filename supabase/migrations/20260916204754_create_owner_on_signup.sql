-- Create the owners row automatically when someone signs up through the
-- magic link, so every signed-in user is guaranteed to have one and no app
-- code path has to remember to insert it.

-- Security definer because the trigger fires as the auth service's role, which
-- has no grant on public.owners. The empty search_path stops a caller from
-- shadowing `owners` with an object in another schema.
create function public.create_owner_for_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.owners (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.create_owner_for_new_user();
