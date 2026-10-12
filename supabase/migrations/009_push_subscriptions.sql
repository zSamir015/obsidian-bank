-- Obsidian Bank — web push subscriptions for flagged activity
--
-- * A browser that opts in stores its push subscription here: the endpoint the push service
--   gave it, the two keys that encrypt the payload, and the language the notification text
--   should use. Nothing about the user's money is stored with it.
-- * The client can only save or remove its own subscriptions, through
--   save_push_subscription() and delete_push_subscription(). It can read them, nothing else.
-- * Delivery (010) reads them with the service role from the send-push Edge Function.
--
-- Error codes: not_authenticated, invalid_subscription

create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  endpoint   text        not null unique
                         check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh     text        not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth       text        not null check (auth ~ '^[A-Za-z0-9_-]{16,32}$'),
  locale     text        not null default 'en' check (locale in ('en', 'es')),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users read own push subscriptions" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Schema default privileges grant every role full access to new relations: keep SELECT only.
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- save_push_subscription: stores (or moves to the caller) this browser's subscription
-- ---------------------------------------------------------------------------

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_locale   text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{80,100}$'
     or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{16,32}$'
     or p_locale is null or p_locale not in ('en', 'es') then
    raise exception 'invalid_subscription';
  end if;

  -- An endpoint belongs to one browser. If another demo session used this browser before,
  -- the subscription now notifies the current one only.
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, locale)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_locale)
  on conflict (endpoint) do update
     set user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         locale = excluded.locale,
         created_at = now();
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_push_subscription: opt-out; only removes the caller's own subscription
-- ---------------------------------------------------------------------------

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.push_subscriptions
   where endpoint = p_endpoint and user_id = v_uid;
end;
$$;

revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;
