-- Obsidian Bank — send a web push when a flagged-activity notification is created
--
-- Separate from 009 because PGlite (used for migration tests) has no pg_net or Vault.
--
-- * After a notification is inserted, and only if its owner has opted in on some browser,
--   pg_net posts its id to the send-push Edge Function. The request is queued and sent after
--   the transaction commits, so a slow or failing push never blocks or undoes the
--   notification itself.
-- * Only the notification id travels in this request. The function reads merchant, amount
--   and last four digits from the notification, which is all a push may carry.
-- * The function URL and the shared secret live in Vault ('push_function_url' and
--   'push_webhook_secret'), not in the repository. Until both exist nothing is sent.

create extension if not exists pg_net with schema extensions;

create or replace function public.send_flagged_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.send_flagged_push() from public, anon, authenticated;

drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_flagged_push();
