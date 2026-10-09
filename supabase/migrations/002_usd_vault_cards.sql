-- Obsidian Bank — USD, vault accounts, cards and positive amounts
--
-- * Amounts are always positive; direction lives in transactions.type (debit | credit).
-- * Accounts: 'savings' becomes 'vault' with an APY in basis points. Currency is USD.
-- * Categories: corporate | travel | services | payroll, plus transfer for internal moves.
--   transfer is never budgeted and is excluded from spending/income analytics.
-- * New cards table. Only last4 is stored: never the full card number (PAN) or CVV.
-- * Demo seeding moves to seed_demo_data(user_id). Every existing user's legacy data is
--   deleted and reseeded so nobody is left without data.
--
-- SECURITY DEFINER functions pin search_path = ''. Client-callable functions check
-- auth.uid(); internal ones are not executable by the API roles (anon, authenticated).

-- ---------------------------------------------------------------------------
-- transactions: signed amounts -> positive amount + type, plus status
-- ---------------------------------------------------------------------------

alter table public.transactions
  add column type   text,
  add column status text not null default 'completed'
    check (status in ('completed', 'pending', 'flagged'));

update public.transactions
   set type         = case when amount_cents < 0 then 'debit' else 'credit' end,
       amount_cents = abs(amount_cents);

alter table public.transactions
  alter column type set not null,
  add constraint transactions_type_check check (type in ('debit', 'credit')),
  drop constraint transactions_amount_cents_check,
  add constraint transactions_amount_cents_check check (amount_cents > 0);

-- ---------------------------------------------------------------------------
-- Legacy demo data (EUR, Spanish categories) is replaced, then reseeded below.
-- ---------------------------------------------------------------------------

delete from public.budgets;
delete from public.transactions;
delete from public.accounts;

alter table public.transactions
  drop constraint transactions_category_check,
  add constraint transactions_category_check
    check (category in ('corporate', 'travel', 'services', 'payroll', 'transfer'));

-- Supports filtering a user's activity by status (e.g. flagged review queue).
create index transactions_user_status_idx on public.transactions (user_id, status);

alter table public.budgets
  add constraint budgets_category_check
    check (category in ('corporate', 'travel', 'services', 'payroll'));

-- ---------------------------------------------------------------------------
-- accounts: savings -> vault, APY, USD
-- ---------------------------------------------------------------------------

alter table public.accounts
  drop constraint accounts_kind_check,
  add constraint accounts_kind_check check (kind in ('checking', 'vault')),
  add column apy_bps integer not null default 0 check (apy_bps between 0 and 10000),
  alter column currency set default 'USD',
  add constraint accounts_currency_check check (currency = 'USD');

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------

create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete cascade,
  card_holder text not null check (length(card_holder) between 1 and 26),
  last4       text not null check (last4 ~ '^[0-9]{4}$'),
  expiry      text not null check (expiry ~ '^(0[1-9]|1[0-2])/[0-9]{2}$'),
  tier        text not null check (tier in ('black', 'platinum', 'corporate')),
  limit_cents bigint not null check (limit_cents > 0),
  spent_cents bigint not null default 0,
  is_frozen   boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint cards_spent_cents_check check (spent_cents between 0 and limit_cents)
);
create index cards_user_id_idx on public.cards (user_id);
create index cards_account_id_idx on public.cards (account_id);

alter table public.cards enable row level security;

create policy "Users read own cards" on public.cards
  for select to authenticated using ((select auth.uid()) = user_id);

-- Card changes (e.g. freezing) will go through an RPC that checks ownership.
revoke insert, update, delete on public.cards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- transfer_funds: same contract and locking as 001, with positive legs
-- ---------------------------------------------------------------------------

create or replace function public.transfer_funds(
  p_from          uuid,
  p_to            uuid,
  p_amount_cents  bigint,
  p_description   text default 'Internal transfer'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_transfer_id uuid := gen_random_uuid();
  v_description text := left(coalesce(nullif(trim(p_description), ''), 'Internal transfer'), 140);
  v_from        public.accounts;
  v_to          public.accounts;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_from = p_to then
    raise exception 'same_account';
  end if;

  -- Lock both rows in a deterministic order to prevent deadlocks.
  perform 1 from public.accounts
    where id in (p_from, p_to) and user_id = v_uid
    order by id
    for update;

  select * into v_from from public.accounts where id = p_from and user_id = v_uid;
  select * into v_to   from public.accounts where id = p_to   and user_id = v_uid;

  if v_from.id is null or v_to.id is null then
    raise exception 'account_not_found';
  end if;
  if v_from.balance_cents < p_amount_cents then
    raise exception 'insufficient_funds';
  end if;

  update public.accounts set balance_cents = balance_cents - p_amount_cents where id = p_from;
  update public.accounts set balance_cents = balance_cents + p_amount_cents where id = p_to;

  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, transfer_id)
  values
    (v_uid, p_from, p_amount_cents, 'debit',  'transfer', v_description, v_transfer_id),
    (v_uid, p_to,   p_amount_cents, 'credit', 'transfer', v_description, v_transfer_id);

  return v_transfer_id;
end;
$$;

revoke execute on function public.transfer_funds(uuid, uuid, bigint, text) from public, anon;
grant  execute on function public.transfer_funds(uuid, uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- seed_demo_data: ~3 months of USD activity, two cards and budgets for one user.
-- Internal only: called by handle_new_user() and by this migration.
-- ---------------------------------------------------------------------------

create or replace function public.seed_demo_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checking uuid;
  v_vault    uuid;
begin
  insert into public.accounts (user_id, name, kind, apy_bps)
    values (p_user_id, 'Everyday Checking', 'checking', 0) returning id into v_checking;
  insert into public.accounts (user_id, name, kind, apy_bps)
    values (p_user_id, 'Obsidian Vault', 'vault', 425) returning id into v_vault;

  -- Opening deposits
  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, created_at)
  values
    (p_user_id, v_checking,  500000, 'credit', 'transfer', 'Opening deposit', now() - interval '90 days'),
    (p_user_id, v_vault,    2500000, 'credit', 'transfer', 'Opening deposit', now() - interval '90 days');

  -- Biweekly payroll
  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, created_at)
  select p_user_id, v_checking, 412500, 'credit', 'payroll', 'Payroll — Obsidian Labs Inc.',
         now() - make_interval(days => 14 * w + 3)
  from generate_series(0, 5) as w;

  -- Day-to-day spending, all settled
  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, created_at)
  select p_user_id, v_checking,
         (1500 + floor(random() * 30000))::bigint,
         'debit',
         m.category,
         m.description,
         now() - make_interval(secs => floor(3 * 86400 + random() * 80 * 86400))
  from generate_series(1, 40) as i
  cross join lateral (
    select category, description
    from (values
      ('corporate', 'Amazon Web Services'),
      ('corporate', 'Slack Technologies'),
      ('corporate', 'WeWork'),
      ('corporate', 'Figma'),
      ('travel',    'Delta Air Lines'),
      ('travel',    'Uber'),
      ('travel',    'Marriott Bonvoy'),
      ('travel',    'Hertz'),
      ('services',  'Comcast Xfinity'),
      ('services',  'Con Edison'),
      ('services',  'Verizon Wireless'),
      ('services',  'Notion Labs')
    ) as options (category, description)
    where i > 0 -- correlate with the outer row so each row gets its own random pick
    order by random()
    limit 1
  ) as m;

  -- Recent activity still in flight, and one charge held for review
  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, status, created_at)
  values
    (p_user_id, v_checking,  8940, 'debit', 'travel',    'Uber',                'pending', now() - interval '6 hours'),
    (p_user_id, v_checking, 21900, 'debit', 'corporate', 'Amazon Web Services', 'pending', now() - interval '1 day'),
    (p_user_id, v_checking, 98999, 'debit', 'services',  'Unknown merchant — LAGOS NG', 'flagged', now() - interval '2 days');

  update public.accounts a
     set balance_cents = (
       select coalesce(sum(case t.type when 'credit' then t.amount_cents else -t.amount_cents end), 0)
       from public.transactions t where t.account_id = a.id)
   where a.user_id = p_user_id;

  insert into public.cards (user_id, account_id, card_holder, last4, expiry, tier, limit_cents, spent_cents)
  values
    (p_user_id, v_checking, 'OBSIDIAN MEMBER', lpad(floor(random() * 10000)::text, 4, '0'),
     to_char(now() + interval '3 years', 'MM/YY'), 'black', 5000000, 1284750),
    (p_user_id, v_checking, 'OBSIDIAN MEMBER', lpad(floor(random() * 10000)::text, 4, '0'),
     to_char(now() + interval '2 years', 'MM/YY'), 'platinum', 1500000, 312040);

  insert into public.budgets (user_id, category, limit_cents)
  values
    (p_user_id, 'corporate', 300000),
    (p_user_id, 'travel',    200000),
    (p_user_id, 'services',   80000);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_demo_data(new.id);
  return new;
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Reseed every existing user (legacy data was deleted above).
select public.seed_demo_data(id) from auth.users;
