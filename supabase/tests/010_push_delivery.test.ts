// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readMigration } from './db'

// PGlite has no pg_net or Vault, so the delivery trigger is checked statically. The function
// it calls builds its payload in supabase/functions/send-push/payload.ts (tested separately).
describe('010_push_delivery.sql', () => {
  const sql = readMigration('010_push_delivery.sql').replace(/--.*$/gm, '')

  it('posts only the notification id to the Edge Function, after a notification is created', () => {
    expect(sql).toMatch(/create extension if not exists pg_net/i)
    expect(sql).toMatch(
      /after insert on public\.notifications\s+for each row execute function public\.send_flagged_push\(\)/i,
    )
    expect(sql).toMatch(/body := jsonb_build_object\('notification_id', new\.id\)/i)
    expect(sql).not.toMatch(/new\.(merchant|amount_cents|card_last4)/i)
  })

  it('does nothing for users who have not opted in, or before the secrets are set', () => {
    expect(sql).toMatch(/if not exists \(select 1 from public\.push_subscriptions s where s\.user_id = new\.user_id\)/i)
    expect(sql).toMatch(/if v_url is null or v_secret is null then\s+return new;/i)
  })

  it('keeps the URL and secret in Vault and the trigger function out of the API', () => {
    expect(sql).toMatch(/vault\.decrypted_secrets where name = 'push_function_url'/i)
    expect(sql).toMatch(/vault\.decrypted_secrets where name = 'push_webhook_secret'/i)
    expect(sql).toMatch(/security definer\s+set search_path = ''/i)
    expect(sql).toMatch(/revoke all on function public\.send_flagged_push\(\) from public, anon, authenticated/i)
  })
})
