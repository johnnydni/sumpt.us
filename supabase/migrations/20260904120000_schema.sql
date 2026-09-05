-- sumpt.us — schema
--
-- Two decisions shape everything below.
--
-- 1. Money is an integer in the currency's minor unit, exactly as in the app.
--    No numeric, no float. A split that does not reconcile to its total is
--    rejected by the database, not just by the client.
--
-- 2. A person is an `identity`, not an account. The app has always had one
--    address space for people — expenses reference a person id, and the
--    overview rolls balances up per counterpart across every group. An id tied
--    to a group membership would break that rollup (the same friend would
--    appear once per group), and an id tied to an auth user could not represent
--    someone who was typed in and never signs up. `identities` is that stable
--    id: it may or may not be claimed by an account.

create schema if not exists app;
comment on schema app is
  'Helpers and policy functions. Not exposed through the API, unlike public.';

-- ---------------------------------------------------------------------------
-- Enumerations — mirrors of the unions in src/types/index.ts
-- ---------------------------------------------------------------------------

create type public.currency_code as enum ('EUR', 'USD', 'GBP', 'CHF', 'JPY');
create type public.category_id   as enum
  ('food', 'accommodation', 'transport', 'activities', 'groceries', 'other');
create type public.split_method  as enum ('equal', 'amount', 'percentage', 'shares');
create type public.group_icon    as enum ('travel', 'food', 'home', 'sports', 'event', 'custom');
create type public.member_role   as enum ('owner', 'member');

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null check (length(btrim(display_name)) between 1 and 80),
  handle        text not null check (handle ~ '^[a-z0-9_.-]{2,40}$'),
  avatar_url    text,
  onboarded     boolean not null default false,

  -- Preferences travel with the account rather than the device.
  currency      public.currency_code not null default 'EUR',
  language      text not null default 'en' check (language in ('en', 'de')),
  notifications boolean not null default true,
  reduce_motion boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index profiles_handle_key on public.profiles (lower(handle));

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.identities (
  id           uuid primary key default gen_random_uuid(),

  -- Null while nobody has claimed this person. Set once they sign in and take
  -- it over, which is what carries their history with them.
  user_id      uuid unique references auth.users on delete set null,

  -- Who introduced this person. For an account's own identity, itself. Nulled
  -- rather than cascaded when that account goes: a placeholder someone typed
  -- in is a member of a group, and deleting the person who added them would
  -- take a participant out of other people's expenses.
  created_by   uuid references auth.users on delete set null,

  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  avatar_url   text,
  email        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index identities_created_by_idx on public.identities (created_by);

comment on table public.identities is
  'A person as far as the system can tell. Two people can each introduce the '
  'same human before either signs up, which leaves two identities; the one '
  'they claim keeps its history, the other stays a placeholder. That is the '
  'same duplication a local address book already allows.';

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 80),
  icon        public.group_icon not null default 'travel',
  emoji       text check (emoji is null or length(emoji) <= 8),
  cover_url   text,
  currency    public.currency_code not null default 'EUR',

  -- Set when the group is a trip. The Free tier caps this at six months; the
  -- cap itself is an entitlement rule, so it is not a constraint here.
  starts_on   date,
  ends_on     date,
  constraint groups_dates_ordered check (ends_on is null or starts_on is null or ends_on >= starts_on),

  -- Authorship is metadata; the group is not. Losing who created it when they
  -- delete their account is acceptable, losing the group is not.
  created_by  uuid references auth.users on delete set null,
  archived_at timestamptz,
  settled_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index groups_created_by_idx on public.groups (created_by);

create table public.group_members (
  group_id    uuid not null references public.groups on delete cascade,
  identity_id uuid not null references public.identities on delete restrict,
  role        public.member_role not null default 'member',
  joined_at   timestamptz not null default now(),
  primary key (group_id, identity_id)
);

create index group_members_identity_idx on public.group_members (identity_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups on delete cascade,
  title        text not null check (length(btrim(title)) between 1 and 120),

  amount_minor bigint not null check (amount_minor > 0),
  currency     public.currency_code not null,

  paid_by      uuid not null references public.identities on delete restrict,
  split_method public.split_method not null,
  category     public.category_id not null default 'other',
  note         text check (note is null or length(note) <= 2000),

  -- Foreign entry, kept for display only. The split and every balance is
  -- computed from amount_minor in the group's currency; this is what the
  -- person typed, plus the rate fixed at the trip's start.
  foreign_amount_minor bigint check (foreign_amount_minor is null or foreign_amount_minor > 0),
  foreign_currency     public.currency_code,
  -- Rate as an integer: units of foreign currency per one group unit, ×10000.
  fx_rate_e4           bigint check (fx_rate_e4 is null or fx_rate_e4 > 0),
  constraint expenses_foreign_complete check (
    (foreign_amount_minor is null and foreign_currency is null and fx_rate_e4 is null)
    or (foreign_amount_minor is not null and foreign_currency is not null and fx_rate_e4 is not null)
  ),

  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index expenses_group_idx on public.expenses (group_id, created_at desc);
create index expenses_paid_by_idx on public.expenses (paid_by);

create table public.expense_participants (
  expense_id  uuid not null references public.expenses on delete cascade,
  identity_id uuid not null references public.identities on delete restrict,

  -- The settled result after rounding. Authoritative, and computed once by the
  -- device that created the expense so every device shows the same cents.
  share_minor bigint not null check (share_minor >= 0),

  -- The raw input: minor units for 'amount', basis points for 'percentage',
  -- whole shares for 'shares', null for an equal split.
  weight      bigint check (weight is null or weight >= 0),

  primary key (expense_id, identity_id)
);

-- ---------------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------------

create table public.settlements (
  id             uuid primary key default gen_random_uuid(),

  -- Always group-scoped. Two ledgers have different members, so a debt in one
  -- group is never netted against another; a payment that clears debts in
  -- several groups is recorded once per group.
  group_id       uuid not null references public.groups on delete cascade,

  from_identity  uuid not null references public.identities on delete restrict,
  to_identity    uuid not null references public.identities on delete restrict,
  constraint settlements_two_parties check (from_identity <> to_identity),

  amount_minor   bigint not null check (amount_minor > 0),
  currency       public.currency_code not null,
  note           text check (note is null or length(note) <= 2000),

  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz not null default now()
);

create index settlements_group_idx on public.settlements (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Sharing and entitlements — schema now, behaviour in later blocks
-- ---------------------------------------------------------------------------

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups on delete cascade,

  -- The secret lives in the link. Only its hash is stored, so a leaked table
  -- dump does not hand out group access.
  token_hash  text not null unique,

  -- Which seat the link fills. Set when inviting a specific placeholder so the
  -- joiner claims that person's history instead of arriving as a new member.
  identity_id uuid references public.identities on delete set null,

  created_by  uuid not null references auth.users on delete cascade,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

create index invitations_group_idx on public.invitations (group_id);

create table public.entitlements (
  user_id     uuid primary key references auth.users on delete cascade,

  -- Named for what was bought, resolved server-side. The client never decides
  -- what it is allowed to do.
  plan        text not null default 'free'
                check (plan in ('free', 'lifetime', 'lifetime_household', 'pro', 'pro_household', 'household')),
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- A Trip Pass is bought for one group and lapses with it, so it cannot live on
-- the account row.
create table public.group_passes (
  group_id   uuid primary key references public.groups on delete cascade,
  purchased_by uuid references auth.users on delete set null,
  starts_at  timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Invariants
-- ---------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch   before update on public.profiles   for each row execute function app.touch_updated_at();
create trigger identities_touch before update on public.identities for each row execute function app.touch_updated_at();
create trigger groups_touch     before update on public.groups     for each row execute function app.touch_updated_at();

/*
 * The split must reconcile to the total.
 *
 * This is the app's second money rule, enforced where it cannot be bypassed:
 * a client with a rounding bug gets a rejected write rather than a group whose
 * balances quietly fail to sum to zero. Deferred to the end of the
 * transaction, since an expense and its participants arrive as separate
 * statements.
 */
create or replace function app.assert_split_reconciles()
returns trigger language plpgsql as $$
declare
  expense_id_to_check uuid := coalesce(new.expense_id, old.expense_id);
  total bigint;
  parts bigint;
begin
  select e.amount_minor into total from public.expenses e where e.id = expense_id_to_check;
  if total is null then
    return null; -- the expense itself was deleted; nothing left to reconcile
  end if;

  select coalesce(sum(p.share_minor), 0) into parts
  from public.expense_participants p
  where p.expense_id = expense_id_to_check;

  if parts <> total then
    raise exception
      'split does not reconcile: shares total % but the expense is % (expense %)',
      parts, total, expense_id_to_check
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger expense_participants_reconcile
  after insert or update or delete on public.expense_participants
  deferrable initially deferred
  for each row execute function app.assert_split_reconciles();

/*
 * Everyone an expense touches must belong to the group it sits in. Without
 * this, a mistyped id silently creates a debt for someone who is not there.
 */
create or replace function app.assert_member_of_expense_group()
returns trigger language plpgsql as $$
declare gid uuid;
begin
  select e.group_id into gid from public.expenses e where e.id = new.expense_id;
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.identity_id = new.identity_id
  ) then
    raise exception 'identity % is not a member of group %', new.identity_id, gid
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger expense_participants_membership
  before insert or update on public.expense_participants
  for each row execute function app.assert_member_of_expense_group();

create or replace function app.assert_expense_payer_is_member()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = new.group_id and gm.identity_id = new.paid_by
  ) then
    raise exception 'payer % is not a member of group %', new.paid_by, new.group_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger expenses_payer_membership
  before insert or update on public.expenses
  for each row execute function app.assert_expense_payer_is_member();

create or replace function app.assert_settlement_parties_are_members()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = new.group_id and gm.identity_id = new.from_identity
  ) or not exists (
    select 1 from public.group_members gm
    where gm.group_id = new.group_id and gm.identity_id = new.to_identity
  ) then
    raise exception 'both parties must belong to group %', new.group_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger settlements_membership
  before insert or update on public.settlements
  for each row execute function app.assert_settlement_parties_are_members();

/*
 * A new account gets a profile and its own identity in one step, so the app
 * never has to handle a signed-in user who is nobody yet.
 */
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 0;
  name text;
begin
  name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1),
    'Someone'
  );

  base_handle := nullif(regexp_replace(lower(name), '[^a-z0-9]', '', 'g'), '');
  base_handle := coalesce(base_handle, 'user');
  base_handle := left(base_handle, 32);
  if length(base_handle) < 2 then base_handle := base_handle || 'x'; end if;
  final_handle := base_handle;

  while exists (select 1 from public.profiles p where lower(p.handle) = final_handle) loop
    suffix := suffix + 1;
    final_handle := left(base_handle, 32 - length(suffix::text)) || suffix::text;
  end loop;

  insert into public.profiles (id, display_name, handle)
  values (new.id, left(name, 80), final_handle);

  insert into public.identities (user_id, created_by, display_name)
  values (new.id, new.id, left(name, 80));

  insert into public.entitlements (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
