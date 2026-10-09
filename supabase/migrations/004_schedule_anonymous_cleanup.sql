-- Obsidian Bank — run the anonymous user cleanup once a day with pg_cron
--
-- Separate from 003 because PGlite (used for migration tests) has no pg_cron.
-- Runs at 04:17 UTC, a quiet hour, and replaces any existing job with the same name so
-- the migration is safe to re-run.

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'cleanup-inactive-anonymous-users';

select cron.schedule(
  'cleanup-inactive-anonymous-users',
  '17 4 * * *',
  $$ select public.cleanup_inactive_anonymous_users() $$
);
