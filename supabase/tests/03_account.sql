-- sumptus — deleting an account without rewriting other people's ledgers
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/03_account.sql

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.expect(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'anna@example.com', '{"full_name":"Anna Roth"}'),
  ('22222222-2222-2222-2222-222222222222', 'ben@example.com',  '{"full_name":"Ben Kaiser"}');

do $$
declare
  anna uuid := '11111111-1111-1111-1111-111111111111';
  ben  uuid := '22222222-2222-2222-2222-222222222222';
  anna_i uuid; ben_i uuid; g uuid; e uuid;
begin
  select id into anna_i from public.identities where user_id = anna;
  select id into ben_i  from public.identities where user_id = ben;

  insert into public.groups (name, currency, created_by) values ('Japan Trip', 'EUR', anna)
  returning id into g;
  insert into public.group_members (group_id, identity_id, role) values
    (g, anna_i, 'owner'), (g, ben_i, 'member');

  insert into public.expenses (group_id, title, amount_minor, currency, paid_by, split_method, created_by)
  values (g, 'Ryokan', 24000, 'EUR', anna_i, 'equal', anna) returning id into e;
  insert into public.expense_participants (expense_id, identity_id, share_minor) values
    (e, anna_i, 12000), (e, ben_i, 12000);

  perform set_config('t.anna', anna::text, true);
  perform set_config('t.anna_i', anna_i::text, true);
  perform set_config('t.ben_i', ben_i::text, true);
  perform set_config('t.g', g::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.anna'))::text, true);

select public.delete_my_account();

reset role;

select pg_temp.expect(
  not exists (select 1 from auth.users where id = current_setting('t.anna')::uuid),
  'the account is gone');

select pg_temp.expect(
  not exists (select 1 from public.profiles where id = current_setting('t.anna')::uuid),
  'and its profile with it');

select pg_temp.expect(
  (select display_name from public.identities where id = current_setting('t.anna_i')::uuid) = 'Anna Roth'
  and (select user_id from public.identities where id = current_setting('t.anna_i')::uuid) is null,
  'the person stays, unclaimed and still named — the group does not lose a member to a blank row');

select pg_temp.expect(
  (select count(*) from public.expenses where group_id = current_setting('t.g')::uuid) = 1
  and (select sum(share_minor) from public.expense_participants) = 24000,
  'the ledger is untouched: leaving does not erase the dinner they paid for');

select pg_temp.expect(
  (select role from public.group_members
    where group_id = current_setting('t.g')::uuid
      and identity_id = current_setting('t.ben_i')::uuid) = 'owner',
  'Ben is promoted, so the group is not left with nobody able to manage it');

-- Signed out, there is nobody to delete.
set local role authenticated;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL  an anonymous caller was allowed to delete an account';
  exception when insufficient_privilege then
    raise notice 'PASS  an anonymous caller is refused  [%]', sqlstate;
  end;
end $$;

rollback;
