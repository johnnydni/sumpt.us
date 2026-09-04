-- sumpt.us — row level security, verified
--
-- Each check either prints a line or aborts the script. Run it against a fresh
-- database (or inside a transaction you roll back) with a role that is not
-- BYPASSRLS, since a superuser sees straight through every policy and would
-- pass all of this while the app leaked everything.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/01_rls.sql
--
-- Sessions are impersonated the way PostgREST does it: set request.jwt.claims
-- to the user's id, then take the `authenticated` role.

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.ok(label text)
returns void language plpgsql as $$
begin raise notice 'PASS  %', label; end $$;

create or replace function pg_temp.expect(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond then perform pg_temp.ok(label);
  else raise exception 'FAIL  %', label; end if;
end $$;

/**
 * Runs `stmt` and asserts the database refuses it.
 *
 * The SET CONSTRAINTS forces deferred triggers to fire here rather than at
 * commit — without it a deferred check looks like it passed, because the
 * script never reaches a commit.
 */
create or replace function pg_temp.expect_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
    set constraints all immediate;
  exception when others then
    perform pg_temp.ok(label || '  [' || sqlstate || ']');
    return;
  end;
  raise exception 'FAIL  % — the statement was allowed', label;
end $$;

create or replace function pg_temp.act_as(who uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who)::text, true);
end $$;

-- --- fixtures --------------------------------------------------------------
-- Two unrelated accounts, each with their own group. The signup trigger gives
-- each a profile, an identity and an entitlements row.

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'anna@example.com', '{"full_name":"Anna Roth"}'),
  ('22222222-2222-2222-2222-222222222222', 'ben@example.com',  '{"full_name":"Ben Kaiser"}');

select pg_temp.expect(
  (select count(*) from public.profiles) = 2
  and (select count(*) from public.identities where user_id is not null) = 2
  and (select count(*) from public.entitlements) = 2,
  'signup trigger creates profile, identity and entitlements');

select pg_temp.expect(
  (select count(distinct handle) from public.profiles) = 2,
  'handles are unique per account');

do $$
declare
  anna uuid := '11111111-1111-1111-1111-111111111111';
  ben  uuid := '22222222-2222-2222-2222-222222222222';
  anna_i uuid; ben_i uuid; tom_i uuid;
  g_anna uuid; g_ben uuid; e uuid;
begin
  select id into anna_i from public.identities where user_id = anna;
  select id into ben_i  from public.identities where user_id = ben;

  -- Tom was typed in by Anna and has no account: the placeholder case.
  insert into public.identities (created_by, display_name)
  values (anna, 'Tom Berger') returning id into tom_i;

  insert into public.groups (name, currency, created_by)
  values ('Japan Trip', 'EUR', anna) returning id into g_anna;
  insert into public.group_members (group_id, identity_id, role) values
    (g_anna, anna_i, 'owner'), (g_anna, tom_i, 'member');

  insert into public.groups (name, currency, created_by)
  values ('Padel Crew', 'EUR', ben) returning id into g_ben;
  insert into public.group_members (group_id, identity_id, role) values (g_ben, ben_i, 'owner');

  insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
  values (g_anna, 'Ryokan', 24000, 'EUR', anna_i, 'equal', anna) returning id into e;
  insert into public.expense_participants (expense_id, identity_id, share_minor) values
    (e, anna_i, 12000), (e, tom_i, 12000);

  perform set_config('test.anna', anna::text, true);
  perform set_config('test.ben', ben::text, true);
  perform set_config('test.anna_identity', anna_i::text, true);
  perform set_config('test.ben_identity', ben_i::text, true);
  perform set_config('test.tom_identity', tom_i::text, true);
  perform set_config('test.g_anna', g_anna::text, true);
  perform set_config('test.g_ben', g_ben::text, true);
  perform set_config('test.expense', e::text, true);
end $$;

-- --- money invariants, before any policy is involved -----------------------

select pg_temp.expect_denied(
  format($f$
    insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
    values (%L, 'Bad split', 10000, 'EUR', %L, 'equal', %L);
    insert into public.expense_participants (expense_id, identity_id, share_minor)
    select id, %L, 4999 from public.expenses where title = 'Bad split';
  $f$, current_setting('test.g_anna'), current_setting('test.anna_identity'),
       current_setting('test.anna'), current_setting('test.anna_identity')),
  'a split that does not reconcile to the total is rejected');

select pg_temp.expect_denied(
  format($f$
    insert into public.expense_participants (expense_id, identity_id, share_minor)
    values (%L, %L, 0);
  $f$, current_setting('test.expense'), current_setting('test.ben_identity')),
  'someone outside the group cannot be an expense participant');

select pg_temp.expect_denied(
  format($f$
    insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
    values (%L, 'Not a member paid', 500, 'EUR', %L, 'equal', %L);
  $f$, current_setting('test.g_anna'), current_setting('test.ben_identity'), current_setting('test.anna')),
  'the payer must belong to the group');

select pg_temp.expect_denied(
  format($f$
    insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
    values (%L, 'Free lunch', 0, 'EUR', %L, 'equal', %L);
  $f$, current_setting('test.g_anna'), current_setting('test.anna_identity'), current_setting('test.anna')),
  'an expense of zero is rejected');

-- --- isolation between accounts --------------------------------------------

set local role authenticated;

select pg_temp.act_as(current_setting('test.anna')::uuid);

select pg_temp.expect(
  (select count(*) from public.groups) = 1
  and (select name from public.groups) = 'Japan Trip',
  'Anna sees only her own group');

select pg_temp.expect(
  (select count(*) from public.expenses) = 1,
  'Anna sees only expenses from groups she belongs to');

select pg_temp.expect(
  (select count(*) from public.group_members) = 2,
  'membership reads resolve without recursing on the policy');

select pg_temp.expect(
  (select array_agg(display_name order by display_name) from public.identities)
    = array['Anna Roth', 'Tom Berger'],
  'Anna sees herself and her placeholder — Ben is not merely filtered, he is absent');

select pg_temp.expect(
  not exists (select 1 from public.profiles where id = current_setting('test.ben')::uuid),
  'Anna cannot read the profile of someone she shares no group with');

select pg_temp.expect_denied(
  format($f$
    insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
    values (%L, 'Intruder', 100, 'EUR', %L, 'equal', %L);
  $f$, current_setting('test.g_ben'), current_setting('test.ben_identity'), current_setting('test.anna')),
  'Anna cannot write an expense into Ben''s group');

select pg_temp.expect(
  (select count(*) from public.groups where id = current_setting('test.g_ben')::uuid) = 0,
  'Ben''s group is invisible to Anna, not merely unwritable');

-- An update against a row the policy hides matches nothing and therefore
-- succeeds, silently, affecting zero rows. So the check is not that the
-- statement was refused — it is that the row is untouched, read back with the
-- policies off.
do $$ begin
  update public.groups set name = 'Hijacked' where id = current_setting('test.g_ben')::uuid;
end $$;

reset role;
select pg_temp.expect(
  (select name from public.groups where id = current_setting('test.g_ben')::uuid) = 'Padel Crew',
  'Anna''s attempt to rename Ben''s group changed nothing');
set local role authenticated;

-- --- privilege escalation ---------------------------------------------------

select pg_temp.expect_denied(
  format($f$ update public.entitlements set plan = 'pro' where user_id = %L; $f$,
    current_setting('test.anna')),
  'a client cannot grant itself a plan');

select pg_temp.expect_denied(
  format($f$ insert into public.entitlements (user_id, plan) values (%L, 'pro'); $f$,
    current_setting('test.ben')),
  'nor insert one for anybody else');

select pg_temp.expect_denied(
  format($f$
    insert into public.identities (user_id, created_by, display_name)
    values (%L, %L, 'Stolen seat');
  $f$, current_setting('test.ben'), current_setting('test.anna')),
  'Anna cannot create an identity pointing at Ben''s account');

select pg_temp.expect_denied(
  format($f$ update public.identities set user_id = %L where id = %L; $f$,
    current_setting('test.anna'), current_setting('test.tom_identity')),
  'claiming a placeholder is not a plain update');

-- --- what sharing a group opens up -----------------------------------------

reset role;
do $$
declare g uuid := current_setting('test.g_anna')::uuid;
begin
  insert into public.group_members (group_id, identity_id)
  values (g, current_setting('test.ben_identity')::uuid);
end $$;
set local role authenticated;

select pg_temp.act_as(current_setting('test.ben')::uuid);

select pg_temp.expect(
  (select count(*) from public.groups) = 2,
  'once added, Ben sees the shared group alongside his own');

select pg_temp.expect(
  exists (select 1 from public.profiles where id = current_setting('test.anna')::uuid),
  'and can now read the profile of the person he shares it with');

select pg_temp.expect(
  (select count(*) from public.expenses where group_id = current_setting('test.g_anna')::uuid) = 1,
  'and the group''s existing history');

-- Same shape as the rename above: the delete policy hides the row rather than
-- raising, so the statement reports success having removed nothing.
do $$ begin
  delete from public.groups where id = current_setting('test.g_anna')::uuid;
end $$;

reset role;
select pg_temp.expect(
  (select count(*) from public.groups where id = current_setting('test.g_anna')::uuid) = 1
  and (select count(*) from public.expenses where group_id = current_setting('test.g_anna')::uuid) = 1,
  'a plain member cannot delete the group, and its history survives the attempt');
set local role authenticated;

rollback;
