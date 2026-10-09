-- Obsidian Bank — initial schema
-- Money is stored as integer cents (bigint) to avoid floating point errors.
-- Clients can only READ accounts and transactions; balances change exclusively
-- through the transfer_funds() RPC, which runs atomically on the server.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('checking', 'savings')),
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  currency      text not null default 'EUR',
  created_at    timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts (user_id);

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  account_id   uuid not null references public.accounts (id) on delete cascade,
  amount_cents bigint not null check (amount_cents <> 0),
  category     text not null check (category in (
                 'income', 'salary', 'housing', 'groceries', 'dining', 'transport',
                 'entertainment', 'shopping', 'utilities', 'health', 'transfer')),
  description  text not null,
  transfer_id  uuid,
  created_at   timestamptz not null default now()
);
create index transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index transactions_account_idx on public.transactions (account_id);

create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category    text not null,
  limit_cents bigint not null check (limit_cents > 0),
  unique (user_id, category)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.accounts     enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "Users read own accounts" on public.accounts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own transactions" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users manage own budgets" on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Defense in depth: no direct writes to money tables from the API.
revoke insert, update, delete on public.accounts, public.transactions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- transfer_funds: atomic transfer between two accounts of the current user
-- ---------------------------------------------------------------------------

create or replace function public.transfer_funds(
  p_from          uuid,
  p_to            uuid,
  p_amount_cents  bigint,
  p_description   text default 'Transferencia'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_transfer_id uuid := gen_random_uuid();
  v_description text := left(coalesce(nullif(trim(p_description), ''), 'Transferencia'), 140);
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

  insert into public.transactions (user_id, account_id, amount_cents, category, description, transfer_id)
  values
    (v_uid, p_from, -p_amount_cents, 'transfer', v_description, v_transfer_id),
    (v_uid, p_to,    p_amount_cents, 'transfer', v_description, v_transfer_id);

  return v_transfer_id;
end;
$$;

revoke execute on function public.transfer_funds(uuid, uuid, bigint, text) from public, anon;
grant  execute on function public.transfer_funds(uuid, uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Demo data: every new user (including anonymous demo sessions) gets two
-- accounts, ~3 months of transactions and a few budgets.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checking uuid;
  v_savings  uuid;
begin
  insert into public.accounts (user_id, name, kind)
    values (new.id, 'Cuenta Corriente', 'checking') returning id into v_checking;
  insert into public.accounts (user_id, name, kind)
    values (new.id, 'Cuenta Ahorro', 'savings') returning id into v_savings;

  -- Opening balances
  insert into public.transactions (user_id, account_id, amount_cents, category, description, created_at)
  values
    (new.id, v_checking,  300000, 'income', 'Saldo inicial', now() - interval '90 days'),
    (new.id, v_savings,  1200000, 'income', 'Saldo inicial', now() - interval '90 days');

  -- Salary and rent for the last three months
  insert into public.transactions (user_id, account_id, amount_cents, category, description, created_at)
  select new.id, v_checking, 245000, 'salary', 'Nómina — Obsidian Labs',
         least(date_trunc('month', now()) - make_interval(months => m) + interval '1 day', now())
  from generate_series(0, 2) as m
  union all
  select new.id, v_checking, -85000, 'housing', 'Alquiler',
         least(date_trunc('month', now()) - make_interval(months => m) + interval '2 days', now())
  from generate_series(0, 2) as m;

  -- Random day-to-day expenses
  insert into public.transactions (user_id, account_id, amount_cents, category, description, created_at)
  select new.id, v_checking,
         -(500 + floor(random() * 8000))::bigint,
         c.category,
         c.description,
         now() - make_interval(secs => floor(random() * 75 * 86400))
  from generate_series(1, 45) as i
  cross join lateral (
    select category, description
    from (values
      ('groceries',     'Mercadona'),
      ('groceries',     'Carrefour'),
      ('dining',        'Restaurante La Brasa'),
      ('dining',        'Café Central'),
      ('transport',     'Metro — recarga'),
      ('transport',     'Gasolinera Repsol'),
      ('entertainment', 'Cine Yelmo'),
      ('entertainment', 'Spotify'),
      ('shopping',      'Zara'),
      ('shopping',      'Amazon'),
      ('utilities',     'Factura luz'),
      ('health',        'Farmacia')
    ) as options (category, description)
    where i > 0 -- correlate with the outer row so each row gets its own random pick
    order by random()
    limit 1
  ) as c;

  update public.accounts a
     set balance_cents = (select coalesce(sum(amount_cents), 0) from public.transactions t where t.account_id = a.id)
   where a.user_id = new.id;

  insert into public.budgets (user_id, category, limit_cents)
  values
    (new.id, 'groceries',     40000),
    (new.id, 'dining',        25000),
    (new.id, 'transport',     12000),
    (new.id, 'entertainment', 15000),
    (new.id, 'shopping',      20000);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
