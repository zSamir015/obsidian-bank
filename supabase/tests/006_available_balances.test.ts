// @vitest-environment node
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate } from './db'

let db: PGlite
let owner: string
let stranger: string
let isolatedAccount: string

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  owner = await createUser(db)
  stranger = await createUser(db)
  const { rows } = await db.query<{ id: string }>(
    `insert into public.accounts (user_id, name, kind)
     values ($1, 'Balance test account', 'checking')
     returning id`,
    [owner],
  )
  isolatedAccount = rows[0]!.id
  await db.query(
    `insert into public.transactions (user_id, account_id, amount_cents, type, category, description, status)
     values
       ($1, $2, 10000, 'credit', 'payroll', 'settled credit', 'completed'),
       ($1, $2, 2500, 'debit', 'services', 'settled debit', 'completed'),
       ($1, $2, 2000, 'debit', 'services', 'pending debit', 'pending'),
       ($1, $2, 3000, 'debit', 'services', 'review debit', 'flagged'),
       ($1, $2, 5000, 'credit', 'payroll', 'pending credit', 'pending'),
       ($1, $2, 7000, 'credit', 'payroll', 'review credit', 'flagged')`,
    [owner, isolatedAccount],
  )
}, 30_000)

const transfer =
  (from: string, to: string, cents: number) =>
  (tx: Transaction) =>
    tx.query<{ id: string }>('select public.transfer_funds($1, $2, $3, $4) as id', [
      from,
      to,
      cents,
      'Available balance test',
    ])

describe('account_balances', () => {
  it('counts completed activity in the ledger and subtracts only pending and flagged debits from available', async () => {
    const { rows } = await db.query<{ ledger_balance_cents: number; available_balance_cents: number }>(
      `select ledger_balance_cents, available_balance_cents
       from public.account_balances where id = $1`,
      [isolatedAccount],
    )

    expect(rows[0]).toEqual({ ledger_balance_cents: 7500, available_balance_cents: 2500 })
  })

  it('recomputes both values when a transaction settles', async () => {
    await db.query(
      `update public.transactions
       set status = 'completed'
       where account_id = $1 and description in ('pending debit', 'review debit')`,
      [isolatedAccount],
    )
    const { rows } = await db.query<{ ledger_balance_cents: number; available_balance_cents: number }>(
      `select ledger_balance_cents, available_balance_cents
       from public.account_balances where id = $1`,
      [isolatedAccount],
    )

    expect(rows[0]).toEqual({ ledger_balance_cents: 2500, available_balance_cents: 2500 })
  })

  it('uses the authenticated user’s row-level policies through the view', async () => {
    const ownerIds = await asUser(db, owner, async (tx) => {
      const result = await tx.query<{ id: string; user_id: string }>('select id, user_id from public.account_balances')
      expect(result.rows.every((row) => row.user_id === owner)).toBe(true)
      return result.rows.map((row) => row.id)
    })
    const strangerIds = await asUser(db, stranger, async (tx) => {
      const result = await tx.query<{ id: string; user_id: string }>('select id, user_id from public.account_balances')
      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows.every((row) => row.user_id === stranger)).toBe(true)
      return result.rows.map((row) => row.id)
    })

    expect(ownerIds).toContain(isolatedAccount)
    expect(ownerIds.some((id) => strangerIds.includes(id))).toBe(false)
  })

  it('grants authenticated users SELECT only, overriding the schema default privileges', async () => {
    const privileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    const { rows } = await db.query<{ role: string; privilege: string; granted: boolean }>(
      `select role, privilege, has_table_privilege(role, 'public.account_balances', privilege) as granted
       from unnest(array['authenticated', 'anon', 'public']) as role
       cross join unnest($1::text[]) as privilege`,
      [privileges],
    )
    const granted = rows.filter((row) => row.granted).map((row) => `${row.role}:${row.privilege}`)

    expect(granted).toEqual(['authenticated:SELECT'])
  })

  it('rejects authenticated writes through the view', async () => {
    // The aggregate view is not updatable, so Postgres refuses these before checking privileges;
    // the privilege test above guards the grants themselves.
    const writes: readonly [string, RegExp][] = [
      [
        `insert into public.account_balances (id, user_id, name, kind, currency, apy_bps, created_at)
         values (gen_random_uuid(), '${owner}', 'Forged', 'checking', 'USD', 0, now())`,
        /cannot insert into view/,
      ],
      [`update public.account_balances set name = 'Renamed' where id = '${isolatedAccount}'`, /cannot update view/],
      [`delete from public.account_balances where id = '${isolatedAccount}'`, /cannot delete from view/],
      ['truncate public.account_balances', /is not a table/],
    ]

    for (const [sql, error] of writes) {
      await expect(asUser(db, owner, (tx) => tx.query(sql))).rejects.toThrow(error)
    }
  })

  it('does not grant anonymous access to account balances', async () => {
    await expect(asUser(db, null, (tx) => tx.query('select * from public.account_balances'))).rejects.toThrow(
      /permission denied/,
    )
  })
})

describe('transfer_funds available balance enforcement', () => {
  async function checkingAndVault() {
    const { rows } = await db.query<{ id: string; kind: string }>(
      `select id, kind from public.accounts where user_id = $1 order by kind`,
      [owner],
    )
    return {
      checking: rows.find((row) => row.kind === 'checking')!.id,
      vault: rows.find((row) => row.kind === 'vault')!.id,
    }
  }

  async function balance(accountId: string, tx?: Transaction) {
    const query = tx ?? db
    const { rows } = await query.query<{ ledger: string; available: string }>(
      `select ledger_balance_cents as ledger, available_balance_cents as available
       from public.account_balances where id = $1`,
      [accountId],
    )
    return { ledger: Number(rows[0]!.ledger), available: Number(rows[0]!.available) }
  }

  it('rejects an amount that fits the ledger but exceeds available funds', async () => {
    const { checking, vault } = await checkingAndVault()
    const before = await balance(checking)
    expect(before.available).toBeLessThan(before.ledger)
    expect(before.available + 1).toBeLessThanOrEqual(before.ledger)

    await expect(asUser(db, owner, transfer(checking, vault, before.available + 1))).rejects.toThrow(
      'insufficient_funds',
    )
  })

  it('updates ledger and available balances after an allowed transfer', async () => {
    const { checking, vault } = await checkingAndVault()
    const beforeFrom = await balance(checking)
    const beforeTo = await balance(vault)
    const amount = beforeFrom.available - 1

    const after = await asUser(db, owner, async (tx) => {
      await transfer(checking, vault, amount)(tx)
      return { from: await balance(checking, tx), to: await balance(vault, tx) }
    })

    expect(after.from).toEqual({
      ledger: beforeFrom.ledger - amount,
      available: beforeFrom.available - amount,
    })
    expect(after.to).toEqual({
      ledger: beforeTo.ledger + amount,
      available: beforeTo.available + amount,
    })
  })
})
