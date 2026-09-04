-- sumpt.us — writing an expense as one act
--
-- An expense and its split are one fact, but two REST inserts are two
-- transactions: if the second fails, the group keeps an expense that somebody
-- paid and nobody owes. The reconciliation trigger cannot catch that, because
-- it hangs off the participants table and an expense with no participants
-- never fires it.
--
-- So expenses are written through these functions instead of through the
-- table. They run as the caller — security invoker, the default — so every
-- policy still applies; what they add is that both halves land together, and
-- that a split which does not add up is refused with a message a developer can
-- act on rather than a bare constraint violation.

create or replace function public.create_expense(
  p_group_id     uuid,
  p_title        text,
  p_amount_minor bigint,
  p_currency     public.currency_code,
  p_paid_by      uuid,
  p_split_method public.split_method,
  p_participants jsonb,
  p_category     public.category_id default 'other',
  p_note         text default null,
  p_created_at   timestamptz default now(),
  p_foreign_amount_minor bigint default null,
  p_foreign_currency     public.currency_code default null,
  p_fx_rate_e4           bigint default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid;
  total bigint;
begin
  if jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    raise exception 'an expense needs at least one participant'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum((value ->> 'share_minor')::bigint), 0)
  into total
  from jsonb_array_elements(p_participants);

  if total <> p_amount_minor then
    raise exception 'split does not reconcile: shares total % but the expense is %',
      total, p_amount_minor using errcode = 'check_violation';
  end if;

  insert into public.expenses (
    group_id, title, amount_minor, currency, paid_by, split_method, category, note,
    foreign_amount_minor, foreign_currency, fx_rate_e4, created_by, created_at
  ) values (
    p_group_id, p_title, p_amount_minor, p_currency, p_paid_by, p_split_method, p_category, p_note,
    p_foreign_amount_minor, p_foreign_currency, p_fx_rate_e4, auth.uid(), p_created_at
  )
  returning id into new_id;

  insert into public.expense_participants (expense_id, identity_id, share_minor, weight)
  select new_id,
         (value ->> 'identity_id')::uuid,
         (value ->> 'share_minor')::bigint,
         nullif(value ->> 'weight', '')::bigint
  from jsonb_array_elements(p_participants);

  return new_id;
end;
$$;

/**
 * Replaces an expense and its whole split in one act.
 *
 * The participants are swapped wholesale rather than diffed: an edit can move
 * a share between two people, and applying that as separate deletes and
 * inserts would leave the split briefly not adding up.
 */
create or replace function public.replace_expense(
  p_id           uuid,
  p_title        text,
  p_amount_minor bigint,
  p_currency     public.currency_code,
  p_paid_by      uuid,
  p_split_method public.split_method,
  p_participants jsonb,
  p_category     public.category_id default 'other',
  p_note         text default null,
  p_foreign_amount_minor bigint default null,
  p_foreign_currency     public.currency_code default null,
  p_fx_rate_e4           bigint default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare total bigint;
begin
  if jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    raise exception 'an expense needs at least one participant'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum((value ->> 'share_minor')::bigint), 0)
  into total
  from jsonb_array_elements(p_participants);

  if total <> p_amount_minor then
    raise exception 'split does not reconcile: shares total % but the expense is %',
      total, p_amount_minor using errcode = 'check_violation';
  end if;

  update public.expenses set
    title = p_title,
    amount_minor = p_amount_minor,
    currency = p_currency,
    paid_by = p_paid_by,
    split_method = p_split_method,
    category = p_category,
    note = p_note,
    foreign_amount_minor = p_foreign_amount_minor,
    foreign_currency = p_foreign_currency,
    fx_rate_e4 = p_fx_rate_e4,
    updated_at = now()
  where id = p_id;

  -- Zero rows means the policy hid it. Saying so beats reporting success on a
  -- write that did nothing.
  if not found then
    raise exception 'expense % not found, or not yours to edit', p_id
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.expense_participants where expense_id = p_id;

  insert into public.expense_participants (expense_id, identity_id, share_minor, weight)
  select p_id,
         (value ->> 'identity_id')::uuid,
         (value ->> 'share_minor')::bigint,
         nullif(value ->> 'weight', '')::bigint
  from jsonb_array_elements(p_participants);
end;
$$;

revoke execute on function
  public.create_expense(uuid, text, bigint, public.currency_code, uuid, public.split_method,
                        jsonb, public.category_id, text, timestamptz, bigint, public.currency_code, bigint),
  public.replace_expense(uuid, text, bigint, public.currency_code, uuid, public.split_method,
                         jsonb, public.category_id, text, bigint, public.currency_code, bigint)
from public;

grant execute on function
  public.create_expense(uuid, text, bigint, public.currency_code, uuid, public.split_method,
                        jsonb, public.category_id, text, timestamptz, bigint, public.currency_code, bigint),
  public.replace_expense(uuid, text, bigint, public.currency_code, uuid, public.split_method,
                         jsonb, public.category_id, text, bigint, public.currency_code, bigint)
to authenticated;
