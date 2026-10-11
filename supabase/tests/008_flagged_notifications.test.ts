// @vitest-environment node
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate, migrations } from './db'

let db: PGlite
let owner: string
let stranger: string
let checking: string
let blackCard: { id: string; last4: string }

const MIGRATION = migrations.indexOf('008_flagged_notifications.sql')

interface NotificationRow {
  readonly id: string
  readonly user_id: string
  readonly transaction_id: string
  readonly merchant: string
  readonly amount_cents: string
  readonly card_last4: string | null
  readonly created_at: Date
  readonly read_at: Date | null
}

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  owner = await createUser(db)
  stranger = await createUser(db)
  const { rows } = await db.query<{ id: string }>(
    `select id from public.accounts where user_id = $1 and kind = 'checking'`,
    [owner],
  )
  checking = rows[0]!.id
  const cards = await db.query<{ id: string; last4: string }>(
    `select id, last4 from public.cards where user_id = $1 and tier = 'black'`,
    [owner],
  )
  blackCard = cards.rows[0]!
}, 30_000)

/** Setup the API roles may not do, inside the same rolled-back transaction. */
async function asAdmin<T>(tx: Transaction, sql: string, params: unknown[] = []) {
  await tx.exec('reset role')
  try {
    return await tx.query<T>(sql, params)
  } finally {
    await tx.exec('set local role authenticated')
  }
}

async function addTransaction(tx: Transaction, status: string, cardId: string | null = null) {
  const { rows } = await asAdmin<{ id: string }>(
    tx,
    `insert into public.transactions (user_id, account_id, card_id, amount_cents, type, category, description, status)
     values ($1, $2, $3, 4250, 'debit', 'travel', 'Hotel Lisboa', $4)
     returning id`,
    [owner, checking, cardId, status],
  )
  return rows[0]!.id
}

const setStatus = (tx: Transaction, id: string, status: string) =>
  asAdmin(tx, 'update public.transactions set status = $2 where id = $1', [id, status])

const notificationsFor = async (tx: Transaction, transactionId: string) =>
  (await tx.query<NotificationRow>('select * from public.notifications where transaction_id = $1', [transactionId]))
    .rows

describe('seeded review charge', () => {
  it('gives every new user one notification with merchant, amount and the Black card last four', async () => {
    const rows = await asUser(
      db,
      owner,
      async (tx) => (await tx.query<NotificationRow>('select * from public.notifications')).rows,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: owner,
      merchant: 'Unrecognized merchant — online',
      amount_cents: 98999,
      card_last4: blackCard.last4,
      read_at: null,
    })
  })

  it('is dated with the charge, not with the sign-up', async () => {
    const { rows } = await db.query<{ same: boolean }>(
      `select n.created_at = t.created_at as same
       from public.notifications n join public.transactions t on t.id = n.transaction_id
       where n.user_id = $1`,
      [owner],
    )
    expect(rows[0]!.same).toBe(true)
  })

  it('records the card that made the payment on the transaction', async () => {
    const { rows } = await db.query<{ card_id: string }>(
      `select card_id from public.transactions where user_id = $1 and status = 'flagged'`,
      [owner],
    )
    expect(rows).toEqual([{ card_id: blackCard.id }])
  })
})

describe('notify_flagged_transaction', () => {
  it('creates a notification when a transaction moves to Under review', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'pending', blackCard.id)
      expect(await notificationsFor(tx, id)).toEqual([])

      await setStatus(tx, id, 'flagged')
      const rows = await notificationsFor(tx, id)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ merchant: 'Hotel Lisboa', amount_cents: 4250, card_last4: blackCard.last4 })
    }))

  it('creates one when a transaction is recorded already under review', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'flagged', blackCard.id)
      expect(await notificationsFor(tx, id)).toHaveLength(1)
    }))

  it('ignores every other status', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'completed')
      await setStatus(tx, id, 'pending')
      await setStatus(tx, id, 'completed')
      expect(await notificationsFor(tx, id)).toEqual([])
    }))

  it('never notifies twice for the same transaction', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'flagged')
      await setStatus(tx, id, 'completed')
      await setStatus(tx, id, 'flagged')
      await asAdmin(tx, `update public.transactions set description = 'Hotel Lisboa (edited)' where id = $1`, [id])
      expect(await notificationsFor(tx, id)).toHaveLength(1)
    }))

  it('leaves last4 empty for payments made without a card', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'flagged')
      expect((await notificationsFor(tx, id))[0]!.card_last4).toBeNull()
    }))

  it('keeps the last four digits it was created with if the card is later removed', () =>
    asUser(db, owner, async (tx) => {
      const id = await addTransaction(tx, 'flagged', blackCard.id)
      await asAdmin(tx, 'delete from public.cards where id = $1', [blackCard.id])
      expect((await notificationsFor(tx, id))[0]!.card_last4).toBe(blackCard.last4)
    }))

  it('holds only merchant, amount and last four digits as content', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'notifications' order by ordinal_position`,
    )
    expect(rows.map((row) => row.column_name)).toEqual([
      'id',
      'user_id',
      'transaction_id',
      'kind',
      'merchant',
      'amount_cents',
      'card_last4',
      'created_at',
      'read_at',
    ])
  })
})

describe('notifications access', () => {
  it('shows each user only their own notifications', async () => {
    const mine = await asUser(
      db,
      owner,
      async (tx) => (await tx.query<NotificationRow>('select * from public.notifications')).rows,
    )
    const theirs = await asUser(
      db,
      stranger,
      async (tx) => (await tx.query<NotificationRow>('select * from public.notifications')).rows,
    )
    expect(mine.every((row) => row.user_id === owner)).toBe(true)
    expect(theirs.every((row) => row.user_id === stranger)).toBe(true)
    expect(theirs.map((row) => row.id)).not.toContain(mine[0]!.id)
  })

  it('hides another user’s notification even when asked for it by id', async () => {
    const { rows } = await db.query<{ id: string }>('select id from public.notifications where user_id = $1', [owner])
    const seen = await asUser(
      db,
      stranger,
      async (tx) => (await tx.query('select * from public.notifications where id = $1', [rows[0]!.id])).rows,
    )
    expect(seen).toEqual([])
  })

  it('gives anonymous requests nothing', async () => {
    await expect(asUser(db, null, (tx) => tx.query('select * from public.notifications'))).rejects.toThrow(
      /permission denied/,
    )
  })

  it.each([
    [
      `insert into public.notifications (user_id, transaction_id, merchant, amount_cents) select user_id, id, 'x', 1 from public.transactions limit 1`,
    ],
    ['update public.notifications set read_at = now()'],
    ['delete from public.notifications'],
    ['select public.notify_flagged_transaction()'],
  ])('does not let signed-in users write directly: %s', async (sql) => {
    await expect(asUser(db, owner, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/)
  })
})

describe('mark_notifications_read', () => {
  it('marks only the caller’s unread notifications and reports how many', () =>
    asUser(db, owner, async (tx) => {
      await addTransaction(tx, 'flagged')
      const first = await tx.query<{ count: number }>('select public.mark_notifications_read() as count')
      expect(first.rows[0]!.count).toBe(2)
      const second = await tx.query<{ count: number }>('select public.mark_notifications_read() as count')
      expect(second.rows[0]!.count).toBe(0)

      const { rows } = await asAdmin<{ user_id: string; read: boolean }>(
        tx,
        'select user_id, read_at is not null as read from public.notifications',
      )
      expect(rows.filter((row) => row.user_id === owner).every((row) => row.read)).toBe(true)
      expect(rows.filter((row) => row.user_id === stranger).every((row) => !row.read)).toBe(true)
    }))

  it('needs a signed-in user', async () => {
    await expect(asUser(db, null, (tx) => tx.query('select public.mark_notifications_read()'))).rejects.toThrow(
      /permission denied/,
    )
    await expect(
      db.transaction(async (tx) => {
        await tx.exec('set local role authenticated')
        await tx.query('select public.mark_notifications_read()')
      }),
    ).rejects.toThrow(/not_authenticated/)
  })
})

describe('upgrading existing users', () => {
  it('attributes their review charge to the Black card and notifies them once', async () => {
    const legacy = await createDb()
    await migrate(legacy, MIGRATION)
    const user = await createUser(legacy)
    await migrate(legacy)

    const { rows } = await legacy.query<NotificationRow & { black_last4: string; card_id: string; black_id: string }>(
      `select n.*, c.last4 as black_last4, c.id as black_id, t.card_id
       from public.notifications n
       join public.transactions t on t.id = n.transaction_id
       join public.cards c on c.user_id = n.user_id and c.tier = 'black'
       where n.user_id = $1`,
      [user],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.card_last4).toBe(rows[0]!.black_last4)
    expect(rows[0]!.card_id).toBe(rows[0]!.black_id)
    await legacy.close()
  }, 30_000)
})
