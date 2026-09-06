-- sumptus — the expense write path
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/02_expense_rpc.sql

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.expect(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end $$;

create or replace function pg_temp.expect_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
    set constraints all immediate;
  exception when others then
    raise notice 'PASS  %  [%]', label, sqlstate;
    return;
  end;
  raise exception 'FAIL  % — the statement was allowed', label;
end $$;

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'anna@example.com', '{"full_name":"Anna Roth"}');

do $$
declare anna uuid := '11111111-1111-1111-1111-111111111111';
        anna_i uuid; tom_i uuid; g uuid;
begin
  select id into anna_i from public.identities where user_id = anna;
  insert into public.identities (created_by, display_name) values (anna, 'Tom Berger') returning id into tom_i;
  insert into public.groups (name, currency, created_by) values ('Japan Trip', 'EUR', anna) returning id into g;
  insert into public.group_members (group_id, identity_id, role) values (g, anna_i, 'owner'), (g, tom_i, 'member');
  perform set_config('t.anna', anna::text, true);
  perform set_config('t.anna_i', anna_i::text, true);
  perform set_config('t.tom_i', tom_i::text, true);
  perform set_config('t.g', g::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.anna'))::text, true);

-- The happy path, with the odd cent that largest-remainder allocation produces.
select public.create_expense(
  current_setting('t.g')::uuid, 'Ryokan', 10001, 'EUR',
  current_setting('t.anna_i')::uuid, 'equal',
  jsonb_build_array(
    jsonb_build_object('identity_id', current_setting('t.anna_i'), 'share_minor', 5001),
    jsonb_build_object('identity_id', current_setting('t.tom_i'),  'share_minor', 5000)
  )) as created \gset

select pg_temp.expect(
  (select amount_minor from public.expenses where id = :'created'::uuid) = 10001
  and (select sum(share_minor) from public.expense_participants where expense_id = :'created'::uuid) = 10001,
  'an expense and its split are written together, odd cent included');

select pg_temp.expect_denied(
  format($f$ select public.create_expense(%L, 'Off by one', 10000, 'EUR', %L, 'equal',
    jsonb_build_array(jsonb_build_object('identity_id', %L, 'share_minor', 9999))); $f$,
    current_setting('t.g'), current_setting('t.anna_i'), current_setting('t.anna_i')),
  'a split that does not add up is refused before anything is written');

select pg_temp.expect(
  (select count(*) from public.expenses where title = 'Off by one') = 0,
  'and leaves no half-written expense behind');

select pg_temp.expect_denied(
  format($f$ select public.create_expense(%L, 'Nobody owes', 5000, 'EUR', %L, 'equal', '[]'::jsonb); $f$,
    current_setting('t.g'), current_setting('t.anna_i')),
  'an expense with no participants is refused');

-- Editing: move the whole share onto one person. Done as separate deletes and
-- inserts this would pass through a moment where the split does not add up.
select public.replace_expense(
  :'created'::uuid, 'Ryokan', 10001, 'EUR',
  current_setting('t.anna_i')::uuid, 'amount',
  jsonb_build_array(
    jsonb_build_object('identity_id', current_setting('t.tom_i'), 'share_minor', 10001, 'weight', 10001)
  ));

select pg_temp.expect(
  (select count(*) from public.expense_participants where expense_id = :'created'::uuid) = 1
  and (select sum(share_minor) from public.expense_participants where expense_id = :'created'::uuid) = 10001,
  'replacing a split swaps it wholesale and still reconciles');

select pg_temp.expect_denied(
  format($f$ select public.replace_expense(%L, 'Ghost', 100, 'EUR', %L, 'equal',
    jsonb_build_array(jsonb_build_object('identity_id', %L, 'share_minor', 100))); $f$,
    gen_random_uuid(), current_setting('t.anna_i'), current_setting('t.anna_i')),
  'editing an expense you cannot see reports a failure rather than silent success');

rollback;
