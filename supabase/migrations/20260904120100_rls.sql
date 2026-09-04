-- sumpt.us — row level security
--
-- One rule carries almost everything: you may see a group if you belong to it,
-- and everything inside a group follows from that.
--
-- The trap this file is written around: a policy on group_members that asks
-- "is the caller a member of this group" queries group_members, which invokes
-- the policy again, and Postgres raises infinite recursion. The membership
-- checks therefore live in `security definer` functions, which run with the
-- owner's rights and so are not themselves filtered. Each sets an empty
-- search_path and fully qualifies its tables, so nothing can be shadowed by a
-- schema the caller controls.

-- ---------------------------------------------------------------------------
-- Policy helpers
-- ---------------------------------------------------------------------------

create or replace function app.my_identity_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select i.id from public.identities i where i.user_id = auth.uid();
$$;

create or replace function app.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members gm
    join public.identities i on i.id = gm.identity_id
    where gm.group_id = gid and i.user_id = auth.uid()
  );
$$;

create or replace function app.is_group_owner(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members gm
    join public.identities i on i.id = gm.identity_id
    where gm.group_id = gid and i.user_id = auth.uid() and gm.role = 'owner'
  );
$$;

/** True when the caller and this person sit in at least one group together. */
create or replace function app.shares_group_with(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members theirs
    join public.group_members mine on mine.group_id = theirs.group_id
    join public.identities i on i.id = mine.identity_id
    where theirs.identity_id = target and i.user_id = auth.uid()
  );
$$;

create or replace function app.group_of_expense(eid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select e.group_id from public.expenses e where e.id = eid;
$$;

revoke execute on function
  app.my_identity_id(), app.is_group_member(uuid), app.is_group_owner(uuid),
  app.shares_group_with(uuid), app.group_of_expense(uuid)
from public;

grant usage on schema app to authenticated;
grant execute on function
  app.my_identity_id(), app.is_group_member(uuid), app.is_group_owner(uuid),
  app.shares_group_with(uuid), app.group_of_expense(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Every table denies by default; the policies below are the only way in.
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.identities           enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.expenses             enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlements          enable row level security;
alter table public.invitations          enable row level security;
alter table public.entitlements         enable row level security;
alter table public.group_passes         enable row level security;

-- profiles ------------------------------------------------------------------
-- Readable by the owner, and by people who share a group — a group screen has
-- to be able to render everyone's name.

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.identities i
      where i.user_id = public.profiles.id and app.shares_group_with(i.id)
    )
  );

create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- No insert or delete policy: profiles are created by the signup trigger and
-- removed with the auth user.

-- identities ----------------------------------------------------------------

create policy identities_select on public.identities for select to authenticated
  using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or app.shares_group_with(id)
  );

-- You may introduce a person, but only as a placeholder or as yourself. Making
-- an identity that already points at somebody else's account would be handing
-- yourself their history.
create policy identities_insert on public.identities for insert to authenticated
  with check (
    created_by = auth.uid()
    and (user_id is null or user_id = auth.uid())
  );

-- A placeholder stays editable by whoever introduced it; a claimed identity
-- only by the person who claimed it. Neither may repoint user_id: claiming
-- runs through a function in the sharing block, never a plain update.
create policy identities_update on public.identities for update to authenticated
  using (
    (user_id = auth.uid())
    or (user_id is null and created_by = auth.uid())
  )
  with check (
    user_id is not distinct from (select i.user_id from public.identities i where i.id = public.identities.id)
  );

create policy identities_delete on public.identities for delete to authenticated
  using (user_id is null and created_by = auth.uid());

-- groups --------------------------------------------------------------------

create policy groups_select on public.groups for select to authenticated
  using (app.is_group_member(id));

create policy groups_insert on public.groups for insert to authenticated
  with check (created_by = auth.uid());

create policy groups_update on public.groups for update to authenticated
  using (app.is_group_member(id)) with check (app.is_group_member(id));

create policy groups_delete on public.groups for delete to authenticated
  using (app.is_group_owner(id));

-- group_members -------------------------------------------------------------

create policy group_members_select on public.group_members for select to authenticated
  using (app.is_group_member(group_id));

-- The creator can seat the first member, which is themselves — an owner check
-- alone could never be satisfied, because being an owner means already having
-- a row in this table.
create policy group_members_insert on public.group_members for insert to authenticated
  with check (
    app.is_group_owner(group_id)
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

create policy group_members_update on public.group_members for update to authenticated
  using (app.is_group_owner(group_id)) with check (app.is_group_owner(group_id));

-- An owner may remove anyone; anyone may remove themselves.
create policy group_members_delete on public.group_members for delete to authenticated
  using (app.is_group_owner(group_id) or identity_id = app.my_identity_id());

-- expenses ------------------------------------------------------------------

create policy expenses_select on public.expenses for select to authenticated
  using (app.is_group_member(group_id));

create policy expenses_insert on public.expenses for insert to authenticated
  with check (app.is_group_member(group_id) and created_by = auth.uid());

create policy expenses_update on public.expenses for update to authenticated
  using (app.is_group_member(group_id)) with check (app.is_group_member(group_id));

create policy expenses_delete on public.expenses for delete to authenticated
  using (app.is_group_member(group_id));

-- expense_participants ------------------------------------------------------

create policy expense_participants_select on public.expense_participants for select to authenticated
  using (app.is_group_member(app.group_of_expense(expense_id)));

create policy expense_participants_insert on public.expense_participants for insert to authenticated
  with check (app.is_group_member(app.group_of_expense(expense_id)));

create policy expense_participants_update on public.expense_participants for update to authenticated
  using (app.is_group_member(app.group_of_expense(expense_id)))
  with check (app.is_group_member(app.group_of_expense(expense_id)));

create policy expense_participants_delete on public.expense_participants for delete to authenticated
  using (app.is_group_member(app.group_of_expense(expense_id)));

-- settlements ---------------------------------------------------------------

create policy settlements_select on public.settlements for select to authenticated
  using (app.is_group_member(group_id));

create policy settlements_insert on public.settlements for insert to authenticated
  with check (app.is_group_member(group_id) and created_by = auth.uid());

create policy settlements_delete on public.settlements for delete to authenticated
  using (app.is_group_member(group_id));

-- A recorded payment is history. Correcting one means deleting it and
-- recording the right one, so there is deliberately no update policy.

-- invitations ---------------------------------------------------------------
-- Only the hash is stored, and a member never needs to read it back: joining
-- goes through a function that takes the token from the link. So members may
-- see that invitations exist, and owners may create and revoke them.

create policy invitations_select on public.invitations for select to authenticated
  using (app.is_group_member(group_id));

create policy invitations_insert on public.invitations for insert to authenticated
  with check (app.is_group_owner(group_id) and created_by = auth.uid());

create policy invitations_delete on public.invitations for delete to authenticated
  using (app.is_group_owner(group_id));

-- entitlements and passes ---------------------------------------------------
-- Read-only to the client, in every case. What someone has paid for is decided
-- by the payment provider's webhook running under the service role; a client
-- that could write here could simply grant itself Pro.

create policy entitlements_select on public.entitlements for select to authenticated
  using (user_id = auth.uid());

create policy group_passes_select on public.group_passes for select to authenticated
  using (app.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- Grants
--
-- Stated outright rather than left to the project's default privileges: a
-- policy only ever narrows what a grant already allows, so a table that
-- silently lost its grant fails closed in a way that looks like a policy bug.
-- anon gets nothing — every screen in this app is behind sign-in.
-- ---------------------------------------------------------------------------

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.identities to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.expense_participants to authenticated;
grant select, insert, delete on public.settlements to authenticated;
grant select, insert, delete on public.invitations to authenticated;

-- Read-only: what someone paid for is written by the payment webhook under the
-- service role, never by the client.
grant select on public.entitlements to authenticated;
grant select on public.group_passes to authenticated;
