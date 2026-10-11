-- Obsidian Bank — in-app notifications for flagged activity
--
-- * When a transaction is created as, or moves to, 'flagged' (shown as "Under review"), a
--   trigger writes one notification for its owner. The client never creates them.
-- * A notification keeps only what the message needs: merchant, amount and the card's last
--   four digits, copied when it is created. No account ids, balances or card details.
-- * Card purchases now record which card was used (transactions.card_id), so the last four
--   digits come from the card that made the payment. Transfers and deposits have no card.
-- * The client can read its own notifications and mark them read through
--   mark_notifications_read(). Nothing else is writable from the API.
--
-- Error codes: not_authenticated

-- ---------------------------------------------------------------------------
-- transactions.card_id: the card that made a payment, if any
-- ---------------------------------------------------------------------------

alter table public.transactions
  add column card_id uuid references public.cards (id) on delete set null;

create index transactions_card_id_idx on public.transactions (card_id) where card_id is not null;

-- The seeded review charge was always a card payment: attribute it to the user's Black card
-- on the same account (or, failing that, their oldest card on it).
update public.transactions t
   set card_id = (
     select c.id from public.cards c
      where c.user_id = t.user_id and c.account_id = t.account_id
      order by (c.tier = 'black') desc, c.created_at, c.id
      limit 1)
 where t.status = 'flagged' and t.card_id is null;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  transaction_id uuid        not null references public.transactions (id) on delete cascade,
  kind           text        not null default 'flagged' check (kind in ('flagged')),
  merchant       text        not null check (char_length(merchant) between 1 and 140),
  amount_cents   bigint      not null check (amount_cents > 0),
  card_last4     text        check (card_last4 ~ '^[0-9]{4}$'),
  created_at     timestamptz not null default now(),
  read_at        timestamptz,
  -- One notification per transaction and kind, even if it is flagged again later.
  constraint notifications_transaction_kind_key unique (transaction_id, kind)
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read own notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);

-- Schema default privileges grant every role full access to new relations: keep SELECT only.
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- notify_flagged_transaction: runs on the transition to 'flagged', never from the API
-- ---------------------------------------------------------------------------

create or replace function public.notify_flagged_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, transaction_id, kind, merchant, amount_cents, card_last4, created_at)
  values (
    new.user_id,
    new.id,
    'flagged',
    left(new.description, 140),
    new.amount_cents,
    (select c.last4 from public.cards c where c.id = new.card_id and c.user_id = new.user_id),
    -- Created already under review: dated with the charge. Moved there later: dated now.
    case when tg_op = 'INSERT' then new.created_at else now() end
  )
  on conflict (transaction_id, kind) do nothing;
  return new;
end;
$$;

revoke all on function public.notify_flagged_transaction() from public, anon, authenticated;

create trigger transactions_notify_flagged_insert
  after insert on public.transactions
  for each row when (new.status = 'flagged')
  execute function public.notify_flagged_transaction();

create trigger transactions_notify_flagged_update
  after update of status on public.transactions
  for each row when (new.status = 'flagged' and old.status is distinct from 'flagged')
  execute function public.notify_flagged_transaction();

-- Existing users already have a flagged charge: give them its notification too, dated with
-- the charge itself.
insert into public.notifications (user_id, transaction_id, kind, merchant, amount_cents, card_last4, created_at)
select t.user_id, t.id, 'flagged', left(t.description, 140), t.amount_cents, c.last4, t.created_at
  from public.transactions t
  left join public.cards c on c.id = t.card_id and c.user_id = t.user_id
 where t.status = 'flagged'
on conflict (transaction_id, kind) do nothing;

-- ---------------------------------------------------------------------------
-- mark_notifications_read: marks every unread notification of the caller as read
-- ---------------------------------------------------------------------------

create or replace function public.mark_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.notifications
     set read_at = now()
   where user_id = v_uid and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- seed_demo_data: same data as 002, but cards are created first so the charge held for
-- review records the Black card, and its notification shows that card's last four digits.
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
  v_black    uuid;
begin
  insert into public.accounts (user_id, name, kind, apy_bps)
    values (p_user_id, 'Everyday Checking', 'checking', 0) returning id into v_checking;
  insert into public.accounts (user_id, name, kind, apy_bps)
    values (p_user_id, 'Obsidian Vault', 'vault', 425) returning id into v_vault;

  insert into public.cards (user_id, account_id, card_holder, last4, expiry, tier, limit_cents, spent_cents)
    values (p_user_id, v_checking, 'OBSIDIAN MEMBER', lpad(floor(random() * 10000)::text, 4, '0'),
            to_char(now() + interval '3 years', 'MM/YY'), 'black', 5000000, 1284750)
    returning id into v_black;
  insert into public.cards (user_id, account_id, card_holder, last4, expiry, tier, limit_cents, spent_cents)
    values (p_user_id, v_checking, 'OBSIDIAN MEMBER', lpad(floor(random() * 10000)::text, 4, '0'),
            to_char(now() + interval '2 years', 'MM/YY'), 'platinum', 1500000, 312040);

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

  -- Recent activity still in flight, and one card charge held for review
  insert into public.transactions (user_id, account_id, amount_cents, type, category, description, status, created_at)
  values
    (p_user_id, v_checking,  8940, 'debit', 'travel',    'Uber',                'pending', now() - interval '6 hours'),
    (p_user_id, v_checking, 21900, 'debit', 'corporate', 'Amazon Web Services', 'pending', now() - interval '1 day');
  insert into public.transactions (user_id, account_id, card_id, amount_cents, type, category, description, status, created_at)
  values
    (p_user_id, v_checking, v_black, 98999, 'debit', 'services', 'Unrecognized merchant — online', 'flagged', now() - interval '2 days');

  update public.accounts a
     set balance_cents = (
       select coalesce(sum(case t.type when 'credit' then t.amount_cents else -t.amount_cents end), 0)
       from public.transactions t where t.account_id = a.id)
   where a.user_id = p_user_id;

  insert into public.budgets (user_id, category, limit_cents)
  values
    (p_user_id, 'corporate', 300000),
    (p_user_id, 'travel',    200000),
    (p_user_id, 'services',   80000);
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
