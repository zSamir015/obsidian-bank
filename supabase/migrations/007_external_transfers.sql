-- Obsidian Bank — external transfers to fictional US bank accounts
--
-- * Nothing here contacts a payment network. A transfer is a pending debit on one of the
--   user's accounts plus a row describing the recipient; it is marked settled later.
-- * Only the last four digits of the recipient's account number ever reach the server:
--   the browser validates the full number and sends last4 alone.
-- * Routing numbers are checked against the ABA rules (assigned prefix and weighted
--   checksum) both here and in src/lib/aba.ts.
-- * Settlement is simulated on read: settle_external_transfers() completes the caller's
--   transfers whose settles_at has passed. There is no background job.
--
-- Error codes (mapped to messages in src/lib/errors.ts):
--   not_authenticated, invalid_amount, invalid_routing_number, invalid_account_number,
--   invalid_recipient, invalid_note, per_transfer_limit, daily_limit_exceeded,
--   account_not_found, insufficient_funds

-- ---------------------------------------------------------------------------
-- Category: money sent to someone else. Counted as money out, never budgeted.
-- ---------------------------------------------------------------------------

alter table public.transactions
  drop constraint transactions_category_check,
  add constraint transactions_category_check
    check (category in ('corporate', 'travel', 'services', 'payroll', 'transfer', 'external'));

-- ---------------------------------------------------------------------------
-- ABA routing number validation
-- ---------------------------------------------------------------------------

create or replace function public.aba_routing_is_valid(p_routing text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_prefix integer;
  d        integer[];
begin
  if p_routing is null or p_routing !~ '^[0-9]{9}$' or p_routing = '000000000' then
    return false;
  end if;

  -- First two digits: 00-12 (banks), 21-32 (thrifts), 61-72 (electronic), 80 (traveler's checks).
  v_prefix := substr(p_routing, 1, 2)::integer;
  if not (v_prefix between 0 and 12 or v_prefix between 21 and 32 or v_prefix between 61 and 72 or v_prefix = 80) then
    return false;
  end if;

  select array_agg(substr(p_routing, i, 1)::integer order by i) into d from generate_series(1, 9) as i;
  return (3 * (d[1] + d[4] + d[7]) + 7 * (d[2] + d[5] + d[8]) + (d[3] + d[6] + d[9])) % 10 = 0;
end;
$$;

-- Internal: used by the constraint below and by create_external_transfer.
revoke all on function public.aba_routing_is_valid(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- external_transfers
-- ---------------------------------------------------------------------------

create table public.external_transfers (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  account_id     uuid        not null references public.accounts (id) on delete cascade,
  transaction_id uuid        not null unique references public.transactions (id) on delete cascade,
  recipient_name text        not null check (char_length(recipient_name) between 1 and 70),
  routing_number text        not null check (public.aba_routing_is_valid(routing_number)),
  account_last4  text        not null check (account_last4 ~ '^[0-9]{4}$'),
  amount_cents   bigint      not null check (amount_cents > 0),
  note           text        not null default '' check (char_length(note) <= 140),
  created_at     timestamptz not null default now(),
  settles_at     timestamptz not null,
  settled_at     timestamptz
);

-- Rolling 24-hour limit per user, and the settlement sweep.
create index external_transfers_user_created_idx on public.external_transfers (user_id, created_at desc);
create index external_transfers_unsettled_idx on public.external_transfers (user_id, settles_at)
  where settled_at is null;

alter table public.external_transfers enable row level security;

create policy "Users read own external transfers" on public.external_transfers
  for select to authenticated using ((select auth.uid()) = user_id);

-- Schema default privileges grant every role full access to new relations: keep SELECT only.
revoke all on public.external_transfers from public, anon, authenticated;
grant select on public.external_transfers to authenticated;

-- ---------------------------------------------------------------------------
-- create_external_transfer: one atomic call that validates, checks limits and the
-- available balance, records a pending debit and the transfer, and returns its id.
-- ---------------------------------------------------------------------------

create or replace function public.create_external_transfer(
  p_from           uuid,
  p_amount_cents   bigint,
  p_routing_number text,
  p_account_last4  text,
  p_recipient_name text,
  p_note           text default ''
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid             uuid := auth.uid();
  v_recipient       text := btrim(coalesce(p_recipient_name, ''));
  v_note            text := btrim(coalesce(p_note, ''));
  v_account_id      uuid;
  v_sent_24h        bigint;
  v_available_cents bigint;
  v_transaction_id  uuid;
  v_transfer_id     uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;
  if not public.aba_routing_is_valid(p_routing_number) then
    raise exception 'invalid_routing_number';
  end if;
  if p_account_last4 is null or p_account_last4 !~ '^[0-9]{4}$' then
    raise exception 'invalid_account_number';
  end if;
  if char_length(v_recipient) not between 1 and 70 then
    raise exception 'invalid_recipient';
  end if;
  if char_length(v_note) > 140 then
    raise exception 'invalid_note';
  end if;
  if p_amount_cents > 1000000 then
    raise exception 'per_transfer_limit';
  end if;

  -- Serialise external transfers per user, whatever the source account, so two concurrent
  -- requests cannot both pass the 24-hour limit check. Released at the end of the transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('external_transfers:' || v_uid::text, 0));

  select id into v_account_id
    from public.accounts
    where id = p_from and user_id = v_uid
    for update;
  if v_account_id is null then
    raise exception 'account_not_found';
  end if;

  select coalesce(sum(amount_cents), 0) into v_sent_24h
    from public.external_transfers
    where user_id = v_uid and created_at > now() - interval '24 hours';
  if v_sent_24h + p_amount_cents > 2500000 then
    raise exception 'daily_limit_exceeded';
  end if;

  -- Same rule as public.account_balances: completed activity minus pending and flagged debits.
  select
    coalesce(
      sum(
        case
          when status = 'completed' and type = 'credit' then amount_cents
          when status = 'completed' and type = 'debit' then -amount_cents
          else 0
        end
      ),
      0
    )
    - coalesce(
      sum(case when status in ('pending', 'flagged') and type = 'debit' then amount_cents else 0 end),
      0
    )
  into v_available_cents
  from public.transactions
  where account_id = p_from and user_id = v_uid;

  if v_available_cents < p_amount_cents then
    raise exception 'insufficient_funds';
  end if;

  -- Keeps the legacy balance column equal to the net of all transactions, as transfer_funds does.
  update public.accounts set balance_cents = balance_cents - p_amount_cents where id = p_from;

  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, status)
  values (v_uid, p_from, p_amount_cents, 'debit', 'external',
          left(v_recipient || ' ••' || p_account_last4, 140), 'pending')
  returning id into v_transaction_id;

  insert into public.external_transfers
    (user_id, account_id, transaction_id, recipient_name, routing_number, account_last4, amount_cents, note, settles_at)
  values
    (v_uid, p_from, v_transaction_id, v_recipient, p_routing_number, p_account_last4, p_amount_cents, v_note,
     now() + interval '2 minutes')
  returning id into v_transfer_id;

  return v_transfer_id;
end;
$$;

revoke execute on function public.create_external_transfer(uuid, bigint, text, text, text, text) from public, anon;
grant execute on function public.create_external_transfer(uuid, bigint, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- settle_external_transfers: simulated settlement, run by the client before it reads
-- balances or activity. Completes the caller's due transfers; safe to call repeatedly.
-- ---------------------------------------------------------------------------

create or replace function public.settle_external_transfers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_settled integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  with due as (
    update public.external_transfers
       set settled_at = now()
     where user_id = v_uid and settled_at is null and settles_at <= now()
    returning transaction_id
  )
  update public.transactions t
     set status = 'completed'
    from due
   where t.id = due.transaction_id and t.status = 'pending';

  get diagnostics v_settled = row_count;
  return v_settled;
end;
$$;

revoke execute on function public.settle_external_transfers() from public, anon;
grant execute on function public.settle_external_transfers() to authenticated;
