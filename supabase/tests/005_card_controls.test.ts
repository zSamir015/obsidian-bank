// @vitest-environment node
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate } from './db'

let db: PGlite
let owner: string
let stranger: string
let black: { id: string; spent: number }

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  owner = await createUser(db)
  stranger = await createUser(db)
  const { rows } = await db.query<{ id: string; spent_cents: number }>(
    `select id, spent_cents from public.cards where user_id = $1 and tier = 'black'`,
    [owner],
  )
  black = { id: rows[0]!.id, spent: Number(rows[0]!.spent_cents) }
}, 30_000)

const freeze =
  (frozen: boolean, cardId = black.id) =>
  (tx: Transaction) =>
    tx.query<{ frozen: boolean }>('select public.freeze_card($1, $2) as frozen', [cardId, frozen])

const setLimit =
  (cents: number, cardId = black.id) =>
  (tx: Transaction) =>
    tx.query<{ limit: string }>('select public.update_card_limit($1, $2) as limit', [cardId, cents])

const cardRow = (tx: Transaction) =>
  tx.query<{ is_frozen: boolean; limit_cents: string }>(
    'select is_frozen, limit_cents from public.cards where id = $1',
    [black.id],
  )

describe('freeze_card', () => {
  it('freezes and unfreezes the signed-in user’s card', async () => {
    const result = await asUser(db, owner, async (tx) => {
      const frozen = (await freeze(true)(tx)).rows[0]!.frozen
      const afterFreeze = (await cardRow(tx)).rows[0]!.is_frozen
      const unfrozen = (await freeze(false)(tx)).rows[0]!.frozen
      const afterUnfreeze = (await cardRow(tx)).rows[0]!.is_frozen
      return { frozen, afterFreeze, unfrozen, afterUnfreeze }
    })
    expect(result).toEqual({ frozen: true, afterFreeze: true, unfrozen: false, afterUnfreeze: false })
  })

  it("does not reveal or change another user's card", async () => {
    await expect(asUser(db, stranger, freeze(true))).rejects.toThrow('card_not_found')
  })

  it('rejects unknown cards', async () => {
    await expect(asUser(db, owner, freeze(true, '00000000-0000-4000-8000-00000000dead'))).rejects.toThrow(
      'card_not_found',
    )
  })

  it('rejects a missing frozen value', async () => {
    await expect(
      asUser(db, owner, (tx) => tx.query('select public.freeze_card($1, null)', [black.id])),
    ).rejects.toThrow('invalid_request')
  })
})

describe('update_card_limit', () => {
  it('sets a new limit in whole dollars', async () => {
    const result = await asUser(db, owner, async (tx) => {
      const returned = Number((await setLimit(2_000_000)(tx)).rows[0]!.limit)
      return { returned, stored: Number((await cardRow(tx)).rows[0]!.limit_cents) }
    })
    expect(result).toEqual({ returned: 2_000_000, stored: 2_000_000 })
  })

  it('accepts a limit equal to what is already spent when it is in range and whole dollars', async () => {
    const atSpent = Math.ceil(black.spent / 100) * 100
    await expect(asUser(db, owner, setLimit(atSpent))).resolves.toBeDefined()
  })

  it('rejects a limit below what has been spent', async () => {
    const below = Math.floor(black.spent / 100) * 100 - 10_000
    await expect(asUser(db, owner, setLimit(below))).rejects.toThrow('limit_below_spent')
  })

  it.each([49_900, 10_000_100, 0, -50_000])('rejects %i cents as out of range ($500 to $100,000)', async (cents) => {
    await expect(asUser(db, owner, setLimit(cents))).rejects.toThrow('limit_out_of_range')
  })

  it.each([2_000_050, 50_001])('rejects %i cents because limits are whole dollars', async (cents) => {
    await expect(asUser(db, owner, setLimit(cents))).rejects.toThrow('limit_not_whole_dollars')
  })

  it('rejects a missing limit', async () => {
    await expect(
      asUser(db, owner, (tx) => tx.query('select public.update_card_limit($1, null)', [black.id])),
    ).rejects.toThrow('limit_out_of_range')
  })

  it("does not reveal or change another user's card", async () => {
    await expect(asUser(db, stranger, setLimit(2_000_000))).rejects.toThrow('card_not_found')
  })
})

describe('card control privileges', () => {
  it.each([
    ['freeze_card', (tx: Transaction): Promise<unknown> => freeze(true)(tx)],
    ['update_card_limit', (tx: Transaction): Promise<unknown> => setLimit(2_000_000)(tx)],
  ])('anon cannot execute %s', async (_, call) => {
    await expect(asUser(db, null, call)).rejects.toThrow(/permission denied/)
  })

  it('signed-in users still cannot write to cards directly', async () => {
    await expect(asUser(db, owner, (tx) => tx.query('update public.cards set is_frozen = true'))).rejects.toThrow(
      /permission denied/,
    )
  })

  it('rejects callers without a session even with execute rights', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec('set local role authenticated')
        await tx.query('select public.freeze_card($1, true)', [black.id])
      }),
    ).rejects.toThrow('not_authenticated')
  })
})
