-- Obsidian Bank — cleanup of inactive anonymous demo users
--
-- Every demo visit signs in anonymously and handle_new_user() seeds that user with
-- accounts, cards, budgets and transactions. This function deletes anonymous users with
-- no activity for longer than p_inactive_for; their rows go with them through the
-- existing ON DELETE CASCADE foreign keys (accounts, transactions, cards, budgets, sessions).
--
-- Activity is the latest of: account creation, last sign-in, and the last update of any
-- of the user's sessions (token refreshes keep a returning visitor's session current).
-- Non-anonymous users are never touched.
--
-- Scheduling lives in 004 (pg_cron), so this function can be tested on its own.
-- Internal only: not executable by the API roles.

create or replace function public.cleanup_inactive_anonymous_users(
  p_inactive_for interval default interval '7 days'
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with stale as (
    select u.id
    from auth.users u
    where u.is_anonymous
      and greatest(
            u.created_at,
            coalesce(u.last_sign_in_at, u.created_at),
            coalesce((select max(s.updated_at) from auth.sessions s where s.user_id = u.id), u.created_at)
          ) < now() - p_inactive_for
  )
  delete from auth.users u
   using stale
   where u.id = stale.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_inactive_anonymous_users(interval) from public, anon, authenticated;
