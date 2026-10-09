// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { PGLITE_UNSUPPORTED, allMigrations, readMigration } from './db'

// PGlite has no pg_cron, so the scheduling migration is checked statically; the function it
// schedules is tested in 003_cleanup_anonymous_users.test.ts.
describe('004_schedule_anonymous_cleanup.sql', () => {
  const sql = readMigration('004_schedule_anonymous_cleanup.sql').replace(/--.*$/gm, '')

  it('enables pg_cron and schedules the cleanup function once a day', () => {
    expect(sql).toMatch(/create extension if not exists pg_cron/i)
    expect(sql).toMatch(
      /cron\.schedule\(\s*'cleanup-inactive-anonymous-users',\s*'\d{1,2} \d{1,2} \* \* \*',\s*\$\$\s*select public\.cleanup_inactive_anonymous_users\(\)\s*\$\$\s*\)/i,
    )
  })

  it('is safe to re-run: an existing job with the same name is replaced', () => {
    expect(sql).toMatch(/cron\.unschedule\(/i)
  })
})

describe('PGlite skip list', () => {
  it('only skips migrations that exist and use pg_cron', () => {
    for (const file of Object.keys(PGLITE_UNSUPPORTED)) {
      expect(allMigrations).toContain(file)
      expect(readMigration(file)).toMatch(/pg_cron/)
    }
  })
})
