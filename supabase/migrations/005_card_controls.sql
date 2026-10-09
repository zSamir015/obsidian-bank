-- Obsidian Bank — card controls: freeze/unfreeze and credit limit changes
--
-- Cards stay read-only for the API roles; changes go through these functions, which only
-- touch cards owned by auth.uid(). A card that does not exist and a card owned by someone
-- else both report card_not_found, so ownership is never revealed.
--
-- Error codes (mapped to messages in src/lib/errors.ts):
--   not_authenticated, invalid_request, card_not_found,
--   limit_out_of_range ($500 to $100,000), limit_not_whole_dollars, limit_below_spent

create or replace function public.freeze_card(p_card_id uuid, p_frozen boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_frozen boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_card_id is null or p_frozen is null then
    raise exception 'invalid_request';
  end if;

  update public.cards
     set is_frozen = p_frozen
   where id = p_card_id and user_id = v_uid
  returning is_frozen into v_frozen;

  if not found then
    raise exception 'card_not_found';
  end if;
  return v_frozen;
end;
$$;

create or replace function public.update_card_limit(p_card_id uuid, p_new_limit_cents bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_spent bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_card_id is null then
    raise exception 'invalid_request';
  end if;
  if p_new_limit_cents is null or p_new_limit_cents < 50000 or p_new_limit_cents > 10000000 then
    raise exception 'limit_out_of_range';
  end if;
  if p_new_limit_cents % 100 <> 0 then
    raise exception 'limit_not_whole_dollars';
  end if;

  -- Lock the card so a concurrent charge cannot slip under the new limit.
  select spent_cents into v_spent
    from public.cards
   where id = p_card_id and user_id = v_uid
     for update;

  if not found then
    raise exception 'card_not_found';
  end if;
  if p_new_limit_cents < v_spent then
    raise exception 'limit_below_spent';
  end if;

  update public.cards set limit_cents = p_new_limit_cents where id = p_card_id;
  return p_new_limit_cents;
end;
$$;

revoke execute on function public.freeze_card(uuid, boolean) from public, anon;
revoke execute on function public.update_card_limit(uuid, bigint) from public, anon;
grant  execute on function public.freeze_card(uuid, boolean) to authenticated;
grant  execute on function public.update_card_limit(uuid, bigint) to authenticated;
