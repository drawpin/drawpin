-- Customers sign in too from now on (docs/adr/004-customer-accounts.md), and
-- this trigger would hand every one of them an owners row — making every
-- customer a venue owner.
--
-- Owner rows are created when a board is set up instead, which is the moment
-- someone actually becomes an owner. Signing in no longer implies anything.
drop trigger on_auth_user_created on auth.users;

drop function public.create_owner_for_new_user();
