// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate, migrations } from './db'

const EXPENSE_CATEGORIES = ['corporate', 'travel', 'services']
const CATEGORIES = [...EXPENSE_CATEGORIES, 'payroll', 'transfer']

let db: PGlite
let legacyUser: string // signed up while only 001 existed
let user: string // signed up after 002
let otherUser: string

beforeAll(async () => {
  db = await createDb()
  await migrate(db, migrations.indexOf('002_usd_vault_cards.sql'))
  legacyUser = await createUser(db)
  await migrate(db)
  user = await createUser(db)
  otherUser = await createUser(db)
}, 30_000)

async function rows<T>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows
}

describe('demo data', () => {
  it.each([
    ['users that existed before 002', () => legacyUser],
    ['users created after 002', () => user],
  ])('reseeds %s with a checking and a vault account in USD', async (_, id) => {
    const accounts = await rows<{ kind: string; currency: string; apy_bps: number }>(
      'select kind, currency, apy_bps from public.accounts where user_id = $1 order by kind',
      [id()],
    )
    expect(accounts).toEqual([
      { kind: 'checking', currency: 'USD', apy_bps: 0 },
      { kind: 'vault', currency: 'USD', apy_bps: expect.any(Number) },
    ])
    expect(accounts[1]!.apy_bps).toBeGreaterThan(0)
  })

  it('removes every legacy transaction (no EUR-era categories or signed amounts remain)', async () => {
    const [legacy] = await rows<{ n: number }>(
      `select count(*)::int as n from public.transactions
       where category <> all($1) or amount_cents <= 0 or type is null`,
      [CATEGORIES],
    )
    expect(legacy!.n).toBe(0)
  })

  it('seeds transactions with every status and both directions', async () => {
    const seen = await rows<{ type: string; status: string }>(
      'select distinct type, status from public.transactions where user_id = $1',
      [user],
    )
    expect(new Set(seen.map((r) => r.type))).toEqual(new Set(['debit', 'credit']))
    expect(new Set(seen.map((r) => r.status))).toEqual(new Set(['completed', 'pending', 'flagged']))
  })

  it('keeps each balance equal to credits minus debits', async () => {
    const mismatched = await rows(
      `select a.id from public.accounts a
       where a.balance_cents <> (
         select coalesce(sum(case t.type when 'credit' then t.amount_cents else -t.amount_cents end), 0)
         from public.transactions t where t.account_id = a.id)`,
    )
    expect(mismatched).toEqual([])
  })

  it('seeds two cards that only expose last4', async () => {
    const cards = await rows<{ last4: string; tier: string; spent_cents: string; limit_cents: string }>(
      'select * from public.cards where user_id = $1 order by tier',
      [user],
    )
    expect(cards.map((c) => c.tier)).toEqual(['black', 'platinum'])
    for (const card of cards) {
      expect(card.last4).toMatch(/^\d{4}$/)
      expect(Object.keys(card)).not.toContain('pan')
      expect(Object.keys(card)).not.toContain('cvv')
    }
  })

  it('seeds budgets only for expense categories', async () => {
    const budgets = await rows<{ category: string }>(
      'select category from public.budgets where user_id = $1 order by category',
      [user],
    )
    expect(budgets.map((b) => b.category)).toEqual([...EXPENSE_CATEGORIES].sort())
  })
})

describe('constraints', () => {
  async function account(id: string, kind = 'checking') {
    const [row] = await rows<{ id: string }>('select id from public.accounts where user_id = $1 and kind = $2', [
      id,
      kind,
    ])
    return row!.id
  }

  it.each([0, -100])('rejects transaction amount %i', async (amount) => {
    await expect(
      db.query(
        `insert into public.transactions (user_id, account_id, amount_cents, type, category, description)
         values ($1, $2, $3, 'debit', 'services', 'x')`,
        [user, await account(user), amount],
      ),
    ).rejects.toThrow(/amount_cents/)
  })

  it.each(['type', 'status'])('requires transaction %s', async (column) => {
    await expect(
      db.query(`update public.transactions set ${column} = null where user_id = $1`, [user]),
    ).rejects.toThrow(/not-null/)
  })

  it('rejects a budget for the transfer category', async () => {
    await expect(
      db.query(`insert into public.budgets (user_id, category, limit_cents) values ($1, 'transfer', 100)`, [user]),
    ).rejects.toThrow(/category/)
  })

  it.each(['12345', '12a4', '123'])('rejects card last4 %s', async (last4) => {
    await expect(db.query(`update public.cards set last4 = $2 where user_id = $1`, [user, last4])).rejects.toThrow(
      /last4/,
    )
  })

  it('rejects spending above the card limit', async () => {
    await expect(
      db.query(`update public.cards set spent_cents = limit_cents + 1 where user_id = $1`, [user]),
    ).rejects.toThrow(/spent/)
  })

  it('rejects malformed card expiry', async () => {
    await expect(db.query(`update public.cards set expiry = '13/30' where user_id = $1`, [user])).rejects.toThrow(
      /expiry/,
    )
  })

  describe('transfer_funds', () => {
    const transfer = (from: string, to: string, cents: number) => (tx: Parameters<Parameters<typeof asUser>[2]>[0]) =>
      tx.query<{ id: string }>('select public.transfer_funds($1, $2, $3, $4) as id', [from, to, cents, 'Rent split'])

    it('moves money atomically and records a positive debit and credit', async () => {
      const from = await account(user)
      const to = await account(user, 'vault')
      const result = await asUser(db, user, async (tx) => {
        const before = await tx.query<{ id: string; balance_cents: string }>(
          'select id, balance_cents from public.accounts order by id',
        )
        const { rows: idRows } = await transfer(from, to, 1234)(tx)
        const after = await tx.query<{ id: string; balance_cents: string }>(
          'select id, balance_cents from public.accounts order by id',
        )
        const legs = await tx.query<{ account_id: string; type: string; amount_cents: string; category: string }>(
          'select account_id, type, amount_cents, category from public.transactions where transfer_id = $1',
          [idRows[0]!.id],
        )
        return { before: before.rows, after: after.rows, legs: legs.rows }
      })
      const delta = (id: string) =>
        Number(result.after.find((a) => a.id === id)!.balance_cents) -
        Number(result.before.find((a) => a.id === id)!.balance_cents)
      expect(delta(from)).toBe(-1234)
      expect(delta(to)).toBe(1234)
      expect(result.legs).toEqual(
        expect.arrayContaining([
          { account_id: from, type: 'debit', amount_cents: 1234, category: 'transfer' },
          { account_id: to, type: 'credit', amount_cents: 1234, category: 'transfer' },
        ]),
      )
    })

    it('rejects insufficient funds', async () => {
      const from = await account(user)
      const to = await account(user, 'vault')
      await expect(asUser(db, user, transfer(from, to, 10 ** 12))).rejects.toThrow('insufficient_funds')
    })

    it('rejects transfers into the same account', async () => {
      const from = await account(user)
      await expect(asUser(db, user, transfer(from, from, 100))).rejects.toThrow('same_account')
    })

    it("rejects another user's account", async () => {
      await expect(asUser(db, user, transfer(await account(user), await account(otherUser), 100))).rejects.toThrow(
        'account_not_found',
      )
    })

    it('rejects anonymous callers', async () => {
      await expect(asUser(db, null, transfer(await account(user), await account(user, 'vault'), 100))).rejects.toThrow(
        /permission denied/,
      )
    })
  })
})

describe('row level security', () => {
  it('only shows the signed-in user their own cards', async () => {
    const owners = await asUser(
      db,
      user,
      async (tx) => (await tx.query<{ user_id: string }>('select user_id from public.cards')).rows,
    )
    expect(owners.length).toBeGreaterThan(0)
    expect(owners.every((c) => c.user_id === user)).toBe(true)
  })

  it.each([
    ['update public.cards set is_frozen = true'],
    ['update public.accounts set apy_bps = 10000'],
    ["update public.transactions set status = 'completed'"],
  ])('blocks direct writes: %s', async (sql) => {
    await expect(asUser(db, user, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/)
  })

  it.each(['seed_demo_data(gen_random_uuid())', 'handle_new_user()'])(
    'does not let API roles execute internal function %s',
    async (call) => {
      await expect(asUser(db, user, (tx) => tx.query(`select public.${call}`))).rejects.toThrow(/permission denied/)
    },
  )
})
