-- Enough of Supabase to exercise the migrations locally.
--
-- Not a substitute for the real platform, but it reproduces the two things the
-- policies depend on: an auth.users table with the signup trigger hanging off
-- it, and auth.uid() reading the request's JWT claims. Setting
-- request.jwt.claims is how a session is impersonated in tests, exactly as
-- PostgREST sets it in production.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to authenticated, anon, service_role;

-- Supabase grants this on a real project; every RLS policy in the wild calls
-- auth.uid(). Needed here because the expense functions run as the caller,
-- unlike the security-definer policy helpers.
grant usage on schema auth to authenticated, anon, service_role;
grant execute on function auth.uid() to authenticated, anon, service_role;
