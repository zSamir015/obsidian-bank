// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, migrate } from './db'

let db: PGlite

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
}, 30_000)

const ago = (days: number) => `now() - interval '${days} days'`

/** Creates a user (seeded by handle_new_user) with the given activity timestamps. */
async function user({
  anonymous = true,
  createdDaysAgo,
  lastSignInDaysAgo,
  sessionUpdatedDaysAgo,
}: {
  anonymous?: boolean
  createdDaysAgo: number
  lastSignInDaysAgo?: number
  sessionUpdatedDaysAgo?: number
}) {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, is_anonymous, created_at, last_sign_in_at)
     values (gen_random_uuid(), $1, ${ago(createdDaysAgo)}, ${lastSignInDaysAgo === undefined ? 'null' : ago(lastSignInDaysAgo)})
     returning id`,
    [anonymous],
  )
  const id = rows[0]!.id
  if (sessionUpdatedDaysAgo !== undefined) {
    await db.query(`insert into auth.sessions (user_id, updated_at) values ($1, ${ago(sessionUpdatedDaysAgo)})`, [id])
  }
  return id
}

async function exists(id: string) {
  const { rows } = await db.query<{ n: number }>('select count(*)::int as n from auth.users where id = $1', [id])
  return rows[0]!.n === 1
}

async function rowsOwnedBy(id: string) {
  const { rows } = await db.query<{ n: number }>(
    `select (select count(*) from public.accounts where user_id = $1)
          + (select count(*) from public.transactions where user_id = $1)
          + (select count(*) from public.cards where user_id = $1)
          + (select count(*) from public.budgets where user_id = $1)
          + (select count(*) from auth.sessions where user_id = $1) as n`,
    [id],
  )
  return Number(rows[0]!.n)
}

const cleanup = async () =>
  (await db.query<{ deleted: number }>('select public.cleanup_inactive_anonymous_users() as deleted')).rows[0]!.deleted

describe('cleanup_inactive_anonymous_users', () => {
  it('deletes anonymous users inactive for more than 7 days, with all their data', async () => {
    const stale = await user({ createdDaysAgo: 30, lastSignInDaysAgo: 30, sessionUpdatedDaysAgo: 8 })
    expect(await rowsOwnedBy(stale)).toBeGreaterThan(0)
    const deleted = await cleanup()
    expect(deleted).toBeGreaterThanOrEqual(1)
    expect(await exists(stale)).toBe(false)
    expect(await rowsOwnedBy(stale)).toBe(0)
  })

  it('keeps anonymous users whose session was used recently, however old the account', async () => {
    const active = await user({ createdDaysAgo: 30, lastSignInDaysAgo: 30, sessionUpdatedDaysAgo: 1 })
    await cleanup()
    expect(await exists(active)).toBe(true)
  })

  it('keeps anonymous users created within the last 7 days', async () => {
    const recent = await user({ createdDaysAgo: 6 })
    await cleanup()
    expect(await exists(recent)).toBe(true)
  })

  it('never deletes non-anonymous users, however inactive', async () => {
    const real = await user({ anonymous: false, createdDaysAgo: 400, lastSignInDaysAgo: 400 })
    await cleanup()
    expect(await exists(real)).toBe(true)
    expect(await rowsOwnedBy(real)).toBeGreaterThan(0)
  })

  it('reports how many users it deleted', async () => {
    await user({ createdDaysAgo: 20 })
    await user({ createdDaysAgo: 15, lastSignInDaysAgo: 9 })
    expect(await cleanup()).toBe(2)
    expect(await cleanup()).toBe(0)
  })

  it.each([
    ['anon', null],
    ['authenticated', '00000000-0000-4000-8000-000000000001'],
  ])('cannot be called by the %s API role', async (_, uid) => {
    await expect(asUser(db, uid, (tx) => tx.query('select public.cleanup_inactive_anonymous_users()'))).rejects.toThrow(
      /permission denied/,
    )
  })
})
