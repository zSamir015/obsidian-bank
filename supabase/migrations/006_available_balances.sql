-- Available funds exclude unsettled debits; ledger funds include only completed activity.
create view public.account_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.name,
  a.kind,
  a.currency,
  a.apy_bps,
  a.created_at,
  coalesce(
    sum(
      case
        when t.status = 'completed' and t.type = 'credit' then t.amount_cents
        when t.status = 'completed' and t.type = 'debit' then -t.amount_cents
        else 0
      end
    ),
    0
  )::bigint as ledger_balance_cents,
  (
    coalesce(
      sum(
        case
          when t.status = 'completed' and t.type = 'credit' then t.amount_cents
          when t.status = 'completed' and t.type = 'debit' then -t.amount_cents
          else 0
        end
      ),
      0
    )
    - coalesce(
      sum(case when t.status in ('pending', 'flagged') and t.type = 'debit' then t.amount_cents else 0 end),
      0
    )
  )::bigint as available_balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id and t.user_id = a.user_id
group by a.id;

revoke all on public.account_balances from public, anon;
grant select on public.account_balances to authenticated;

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
  v_uid              uuid := auth.uid();
  v_transfer_id      uuid := gen_random_uuid();
  v_description      text := left(coalesce(nullif(trim(p_description), ''), 'Internal transfer'), 140);
  v_from             public.accounts;
  v_to               public.accounts;
  v_available_cents  bigint;
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

  -- Lock both rows in a deterministic order so concurrent transfers cannot overspend.
  perform 1 from public.accounts
    where id in (p_from, p_to) and user_id = v_uid
    order by id
    for update;

  select * into v_from from public.accounts where id = p_from and user_id = v_uid;
  select * into v_to   from public.accounts where id = p_to   and user_id = v_uid;

  if v_from.id is null or v_to.id is null then
    raise exception 'account_not_found';
  end if;

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
grant execute on function public.transfer_funds(uuid, uuid, bigint, text) to authenticated;
