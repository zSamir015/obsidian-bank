// @vitest-environment node
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate } from './db'

let db: PGlite
let owner: string
let stranger: string
let checking: string
let vault: string
let strangerChecking: string

const VALID_ROUTING = '021000021'

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  owner = await createUser(db)
  stranger = await createUser(db)
  const accounts = async (userId: string) => {
    const { rows } = await db.query<{ id: string; kind: string }>(
      'select id, kind from public.accounts where user_id = $1',
      [userId],
    )
    return {
      checking: rows.find((row) => row.kind === 'checking')!.id,
      vault: rows.find((row) => row.kind === 'vault')!.id,
    }
  }
  ;({ checking, vault } = await accounts(owner))
  strangerChecking = (await accounts(stranger)).checking
}, 30_000)

interface SendInput {
  readonly from?: string
  readonly cents?: number
  readonly routing?: string
  readonly last4?: string
  readonly recipient?: string
  readonly note?: string
}

const send =
  ({
    from = checking,
    cents = 5000,
    routing = VALID_ROUTING,
    last4 = '6789',
    recipient = 'Ada Lovelace',
    note = '',
  }: SendInput = {}) =>
  (tx: Transaction) =>
    tx.query<{ id: string }>('select public.create_external_transfer($1, $2, $3, $4, $5, $6) as id', [
      from,
      cents,
      routing,
      last4,
      recipient,
      note,
    ])

const settle = (tx: Transaction) =>
  tx.query<{ settled: number }>('select public.settle_external_transfers() as settled')

/** Test setup that the API roles may not do (funding, moving clocks), inside the same rolled-back transaction. */
async function asAdmin(tx: Transaction, sql: string, params: unknown[] = []) {
  await tx.exec('reset role')
  try {
    return await tx.query(sql, params)
  } finally {
    await tx.exec('set local role authenticated')
  }
}

/** Adds a transaction the way the seed does, keeping balance_cents equal to the net of all transactions. */
async function addTransaction(
  tx: Transaction,
  accountId: string,
  cents: number,
  type: 'credit' | 'debit',
  status = 'completed',
) {
  await asAdmin(
    tx,
    `insert into public.transactions (user_id, account_id, amount_cents, type, category, description, status)
     values ($1, $2, $3, $4, 'services', 'Test setup', $5)`,
    [owner, accountId, cents, type, status],
  )
  await asAdmin(tx, 'update public.accounts set balance_cents = balance_cents + $2 where id = $1', [
    accountId,
    type === 'credit' ? cents : -cents,
  ])
}

const fund = (tx: Transaction, accountId: string, cents: number) => addTransaction(tx, accountId, cents, 'credit')

const makeDue = (tx: Transaction, id: string) =>
  asAdmin(tx, `update public.external_transfers set settles_at = now() - interval '1 second' where id = $1`, [id])

async function balances(tx: Transaction, accountId: string) {
  const { rows } = await tx.query<{ ledger: string; available: string }>(
    'select ledger_balance_cents as ledger, available_balance_cents as available from public.account_balances where id = $1',
    [accountId],
  )
  return { ledger: Number(rows[0]!.ledger), available: Number(rows[0]!.available) }
}

/**
 * Calls create_external_transfer in its own real transaction, which commits unless the call
 * throws. Whatever is left in the database afterwards is what a failed request would leave.
 */
async function attemptCommitted(input: SendInput): Promise<string | null> {
  try {
    await db.transaction(async (tx) => {
      await tx.exec('set local role authenticated')
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [owner])
      await send(input)(tx)
    })
    return null
  } catch (error) {
    return (error as Error).message
  }
}

async function persistedState() {
  const { rows } = await db.query<{ transfers: string; debits: string; balance: string }>(
    `select (select count(*) from public.external_transfers) as transfers,
            (select count(*) from public.transactions where category = 'external') as debits,
            (select balance_cents from public.accounts where id = $1) as balance`,
    [checking],
  )
  return rows[0]
}

describe('aba_routing_is_valid', () => {
  it.each([
    ['021000021', true],
    ['011000015', true],
    ['122105278', true],
    ['021000022', false], // checksum fails
    ['130000006', false], // checksum passes, but 13 is not an assigned prefix
    ['000000000', false],
    ['02100002', false],
    ['0210000210', false],
    ['02100002a', false],
    ['', false],
  ])('%s → %s', async (routing, expected) => {
    const { rows } = await db.query<{ valid: boolean }>('select public.aba_routing_is_valid($1) as valid', [routing])
    expect(rows[0]!.valid).toBe(expected)
  })

  it('treats null as invalid', async () => {
    const { rows } = await db.query<{ valid: boolean }>('select public.aba_routing_is_valid(null) as valid')
    expect(rows[0]!.valid).toBe(false)
  })

  it('is not callable through the API', async () => {
    for (const role of ['anon', 'authenticated']) {
      const { rows } = await db.query<{ allowed: boolean }>(
        `select has_function_privilege($1, 'public.aba_routing_is_valid(text)', 'EXECUTE') as allowed`,
        [role],
      )
      expect(rows[0]!.allowed).toBe(false)
    }
  })
})

describe('create_external_transfer', () => {
  it('records a pending external debit and the transfer with only the last four digits', async () => {
    const result = await asUser(db, owner, async (tx) => {
      const before = await balances(tx, checking)
      const id = (await send({ cents: 12_345, note: '  Rent  ' })(tx)).rows[0]!.id
      const after = await balances(tx, checking)
      const transfer = (
        await tx.query<Record<string, unknown>>('select * from public.external_transfers where id = $1', [id])
      ).rows[0]!
      const debit = (
        await tx.query<Record<string, unknown>>('select * from public.transactions where id = $1', [
          transfer.transaction_id,
        ])
      ).rows[0]!
      return { before, after, transfer, debit }
    })

    expect(result.debit).toMatchObject({
      account_id: checking,
      type: 'debit',
      category: 'external',
      status: 'pending',
      description: 'Ada Lovelace ••6789',
    })
    expect(Number(result.debit.amount_cents)).toBe(12_345)
    expect(result.transfer).toMatchObject({
      account_id: checking,
      recipient_name: 'Ada Lovelace',
      routing_number: VALID_ROUTING,
      account_last4: '6789',
      note: 'Rent',
      settled_at: null,
    })
    const settlesIn = (result.transfer.settles_at as Date).getTime() - (result.transfer.created_at as Date).getTime()
    expect(settlesIn).toBe(2 * 60 * 1000)
    // Available drops straight away; the ledger only moves on settlement.
    expect(result.after).toEqual({ ledger: result.before.ledger, available: result.before.available - 12_345 })
  })

  it('has no column that could hold a full account number', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'external_transfers' order by ordinal_position`,
    )
    expect(rows.map((row) => row.column_name)).toEqual([
      'id',
      'user_id',
      'account_id',
      'transaction_id',
      'recipient_name',
      'routing_number',
      'account_last4',
      'amount_cents',
      'note',
      'created_at',
      'settles_at',
      'settled_at',
    ])
  })

  it.each([
    [{ routing: '021000022' }, 'invalid_routing_number'],
    [{ routing: '130000006' }, 'invalid_routing_number'],
    [{ routing: '000000000' }, 'invalid_routing_number'],
    [{ last4: '12345' }, 'invalid_account_number'],
    [{ last4: '12a4' }, 'invalid_account_number'],
    [{ recipient: '   ' }, 'invalid_recipient'],
    [{ recipient: 'x'.repeat(71) }, 'invalid_recipient'],
    [{ note: 'x'.repeat(141) }, 'invalid_note'],
    [{ cents: 0 }, 'invalid_amount'],
    [{ cents: -100 }, 'invalid_amount'],
    [{ cents: 1_000_001 }, 'per_transfer_limit'],
  ] as const)('rejects %o with %s and leaves no rows', async (input, code) => {
    const before = await persistedState()
    expect(await attemptCommitted(input)).toContain(code)
    expect(await persistedState()).toEqual(before)
  })

  it('leaves no debit, transfer or balance change when a step after the debit fails', async () => {
    // Make the final insert fail after the balance update and the debit have already run.
    await db.query(`alter table public.external_transfers add constraint test_fail check (note <> 'boom')`)
    try {
      const before = await persistedState()
      expect(await attemptCommitted({ note: 'boom' })).toContain('test_fail')
      expect(await persistedState()).toEqual(before)
    } finally {
      await db.query('alter table public.external_transfers drop constraint test_fail')
    }
  })

  it('accepts exactly $10,000 in one transfer', async () => {
    await asUser(db, owner, async (tx) => {
      await fund(tx, checking, 2_000_000)
      await expect(send({ cents: 1_000_000 })(tx)).resolves.toBeDefined()
    })
  })

  it("rejects an amount above the account's available balance, counting pending debits", async () => {
    const outcome = await asUser(db, owner, async (tx) => {
      // A pending debit leaves $30.00 available; it still counts against the transfer.
      const { available } = await balances(tx, checking)
      await addTransaction(tx, checking, available - 3_000, 'debit', 'pending')
      expect((await balances(tx, checking)).available).toBe(3_000)
      const error = await send({ cents: 3_001 })(tx).then(
        () => null,
        (e: Error) => e.message,
      )
      return { error }
    })
    expect(outcome.error).toContain('insufficient_funds')
  })

  it('enforces the $25,000 rolling 24-hour limit across all source accounts', async () => {
    const outcome = await asUser(db, owner, async (tx) => {
      await fund(tx, checking, 5_000_000)
      await fund(tx, vault, 5_000_000)
      await send({ from: checking, cents: 1_000_000 })(tx)
      await send({ from: vault, cents: 1_000_000 })(tx)
      await send({ from: checking, cents: 500_000 })(tx) // exactly $25,000 in 24 hours
      const error = await send({ from: vault, cents: 1 })(tx).then(
        () => null,
        (e: Error) => e.message,
      )
      return { error }
    })
    expect(outcome.error).toContain('daily_limit_exceeded')
  })

  it('stops counting transfers older than 24 hours towards the limit', async () => {
    await asUser(db, owner, async (tx) => {
      await fund(tx, checking, 5_000_000)
      await send({ cents: 1_000_000 })(tx)
      await send({ cents: 1_000_000 })(tx)
      await send({ cents: 500_000 })(tx)
      await asAdmin(tx, `update public.external_transfers set created_at = created_at - interval '25 hours'`)
      await expect(send({ cents: 1_000_000 })(tx)).resolves.toBeDefined()
    })
  })

  it('serialises transfers per user with a transaction-scoped advisory lock', async () => {
    const locks = await asUser(db, owner, async (tx) => {
      await send()(tx)
      const { rows } = await tx.query<{ held: string }>(
        `select count(*) as held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()`,
      )
      return Number(rows[0]!.held)
    })
    expect(locks).toBe(1)
  })

  it("cannot send from another user's account", async () => {
    await expect(asUser(db, owner, send({ from: strangerChecking }))).rejects.toThrow('account_not_found')
  })

  it('requires a signed-in user', async () => {
    await expect(asUser(db, null, send())).rejects.toThrow(/permission denied/)
  })
})

describe('settle_external_transfers', () => {
  it('leaves transfers pending until settles_at, then completes them once', async () => {
    const result = await asUser(db, owner, async (tx) => {
      const id = (await send({ cents: 7_000 })(tx)).rows[0]!.id
      const notDue = (await settle(tx)).rows[0]!.settled
      const pendingBalances = await balances(tx, checking)

      await makeDue(tx, id)
      const settled = (await settle(tx)).rows[0]!.settled
      const again = (await settle(tx)).rows[0]!.settled
      const settledBalances = await balances(tx, checking)
      const status = (
        await tx.query<{ status: string; settled_at: Date | null }>(
          `select t.status, e.settled_at from public.external_transfers e
           join public.transactions t on t.id = e.transaction_id where e.id = $1`,
          [id],
        )
      ).rows[0]!
      return { notDue, settled, again, pendingBalances, settledBalances, status }
    })

    expect(result.notDue).toBe(0)
    expect(result.settled).toBe(1)
    expect(result.again).toBe(0)
    expect(result.status.status).toBe('completed')
    expect(result.status.settled_at).not.toBeNull()
    // Available already excluded the debit; settling moves it into the ledger.
    expect(result.settledBalances).toEqual({
      ledger: result.pendingBalances.ledger - 7_000,
      available: result.pendingBalances.available,
    })
  })

  it("only settles the caller's own transfers", async () => {
    const result = await asUser(db, owner, async (tx) => {
      const id = (await send()(tx)).rows[0]!.id
      await makeDue(tx, id)
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [stranger])
      const strangerSettled = (await settle(tx)).rows[0]!.settled
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [owner])
      const ownerSettled = (await settle(tx)).rows[0]!.settled
      return { strangerSettled, ownerSettled }
    })
    expect(result).toEqual({ strangerSettled: 0, ownerSettled: 1 })
  })

  it('requires a signed-in user', async () => {
    await expect(asUser(db, null, settle)).rejects.toThrow(/permission denied/)
  })
})

describe('external_transfers access', () => {
  it('lets users read only their own transfers', async () => {
    const result = await asUser(db, owner, async (tx) => {
      await send()(tx)
      const own = (await tx.query<{ user_id: string }>('select user_id from public.external_transfers')).rows
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [stranger])
      const strangers = (await tx.query('select 1 from public.external_transfers')).rows
      return { own, strangers }
    })
    expect(result.own.length).toBeGreaterThan(0)
    expect(result.own.every((row) => row.user_id === owner)).toBe(true)
    expect(result.strangers).toEqual([])
  })

  it('grants authenticated users SELECT only, and nothing to anon or public', async () => {
    const privileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    const { rows } = await db.query<{ role: string; privilege: string; granted: boolean }>(
      `select role, privilege, has_table_privilege(role, 'public.external_transfers', privilege) as granted
       from unnest(array['authenticated', 'anon', 'public']) as role
       cross join unnest($1::text[]) as privilege`,
      [privileges],
    )
    expect(rows.filter((row) => row.granted).map((row) => `${row.role}:${row.privilege}`)).toEqual([
      'authenticated:SELECT',
    ])
  })

  it('rejects direct writes from signed-in users', async () => {
    await expect(
      asUser(db, owner, (tx) =>
        tx.query(
          `insert into public.external_transfers
             (user_id, account_id, transaction_id, recipient_name, routing_number, account_last4, amount_cents, settles_at)
           values ($1, $2, gen_random_uuid(), 'Forged', '${VALID_ROUTING}', '0000', 1, now())`,
          [owner, checking],
        ),
      ),
    ).rejects.toThrow(/permission denied/)
    await expect(
      asUser(db, owner, (tx) => tx.query(`update public.external_transfers set settles_at = now()`)),
    ).rejects.toThrow(/permission denied/)
  })

  it('lets only signed-in users call the two client functions', async () => {
    const { rows } = await db.query<{ fn: string; role: string; allowed: boolean }>(
      `select fn, role, has_function_privilege(role, fn, 'EXECUTE') as allowed
       from unnest(array[
         'public.create_external_transfer(uuid, bigint, text, text, text, text)',
         'public.settle_external_transfers()'
       ]) as fn
       cross join unnest(array['authenticated', 'anon']) as role`,
    )
    expect(rows.filter((row) => row.allowed).map((row) => row.role)).toEqual(['authenticated', 'authenticated'])
  })
})

describe('external category', () => {
  it('cannot be budgeted', async () => {
    await expect(
      db.query(`insert into public.budgets (user_id, category, limit_cents) values ($1, 'external', 1000)`, [owner]),
    ).rejects.toThrow(/budgets_category_check/)
  })
})
