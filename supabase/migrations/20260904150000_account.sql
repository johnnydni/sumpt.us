-- sumptus — deleting your own account
--
-- The client has no rights over auth.users, and granting it any would grant it
-- everybody's. So deletion runs through a security-definer function that can
-- only ever remove the caller's own row, and lets the foreign keys do the rest.
--
-- What goes with it: the profile, the entitlements row, and the identity's
-- claim on the account. What does not: the identity itself, or any group,
-- expense or settlement. Deleting those would rewrite other people's ledgers —
-- someone leaving the app must not silently erase the dinner they paid for.
-- The identity stays as an unclaimed placeholder, exactly as if they had been
-- typed in by hand and never signed up.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_identity uuid;
  orphaned record;
  heir uuid;
begin
  if me is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select i.id into my_identity from public.identities i where i.user_id = me;

  -- Hand on any group this account is the last reachable owner of. Done before
  -- the account is released, so "another owner with an account" still means
  -- what it says.
  for orphaned in
    select gm.group_id
    from public.group_members gm
    join public.identities i on i.id = gm.identity_id
    where gm.role = 'owner' and i.user_id = me
  loop
    if not exists (
      select 1
      from public.group_members other
      join public.identities i2 on i2.id = other.identity_id
      where other.group_id = orphaned.group_id
        and other.role = 'owner'
        and i2.user_id is not null
        and i2.user_id <> me
    ) then
      -- The longest-standing member who could actually sign in and use it.
      select gm.identity_id into heir
      from public.group_members gm
      join public.identities i3 on i3.id = gm.identity_id
      where gm.group_id = orphaned.group_id
        and gm.role = 'member'
        and i3.user_id is not null
        and i3.user_id <> me
      order by gm.joined_at, gm.identity_id
      limit 1;

      if heir is not null then
        update public.group_members
        set role = 'owner'
        where group_id = orphaned.group_id and identity_id = heir;
      end if;
      -- No heir means every remaining member is a placeholder. The group keeps
      -- its history and simply has no owner until somebody claims a seat;
      -- promoting a person who cannot sign in would only look like an owner.
    end if;
  end loop;

  -- Release the seat rather than removing the person: the display name stays,
  -- so the group still reads "Anna" instead of losing a member to a blank row.
  update public.identities set user_id = null where id = my_identity;

  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
