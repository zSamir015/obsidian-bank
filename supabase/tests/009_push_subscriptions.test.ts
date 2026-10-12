// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { asUser, createDb, createUser, migrate } from './db'

let db: PGlite
let owner: string
let stranger: string

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123'
const P256DH = 'B' + 'A'.repeat(86)
const AUTH = 'k'.repeat(22)

const save = (endpoint = ENDPOINT, p256dh = P256DH, auth = AUTH, locale = 'en') =>
  `select public.save_push_subscription('${endpoint}', '${p256dh}', '${auth}', '${locale}')`

beforeAll(async () => {
  db = await createDb()
  await migrate(db)
  owner = await createUser(db)
  stranger = await createUser(db)
}, 30_000)

describe('009_push_subscriptions.sql', () => {
  it('saves the caller’s subscription and lets them read only their own', async () => {
    await asUser(db, owner, async (tx) => {
      await tx.exec(save())
      const { rows } = await tx.query<{ user_id: string; locale: string }>(
        'select user_id, locale from public.push_subscriptions',
      )
      expect(rows).toEqual([{ user_id: owner, locale: 'en' }])
    })
  })

  it('hides other users’ subscriptions', async () => {
    await asUser(db, owner, async (tx) => {
      await tx.exec(save())
      await tx.exec('reset role')
      await tx.exec(`set local role authenticated`)
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [stranger])
      const { rows } = await tx.query('select * from public.push_subscriptions')
      expect(rows).toEqual([])
    })
  })

  it('moves a browser’s endpoint to the latest session that saved it', async () => {
    await asUser(db, owner, async (tx) => {
      await tx.exec(save(ENDPOINT, P256DH, AUTH, 'en'))
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [stranger])
      await tx.exec(save(ENDPOINT, P256DH, AUTH, 'es'))
      await tx.exec('reset role')
      const { rows } = await tx.query<{ user_id: string; locale: string }>(
        'select user_id, locale from public.push_subscriptions',
      )
      expect(rows).toEqual([{ user_id: stranger, locale: 'es' }])
    })
  })

  it.each([
    ['an http endpoint', save('http://push.example/x')],
    ['a malformed key', save(ENDPOINT, 'not a key')],
    ['a malformed auth secret', save(ENDPOINT, P256DH, 'x')],
    ['an unsupported language', save(ENDPOINT, P256DH, AUTH, 'fr')],
  ])('rejects %s', async (_case, sql) => {
    await asUser(db, owner, async (tx) => {
      await expect(tx.exec(sql)).rejects.toThrow('invalid_subscription')
    })
  })

  it('requires a signed-in user', async () => {
    await asUser(db, null, async (tx) => {
      await expect(tx.exec(save())).rejects.toThrow(/permission denied/)
    })
  })

  it('lets the owner opt out, and nobody else', async () => {
    await asUser(db, owner, async (tx) => {
      await tx.exec(save())
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [stranger])
      await tx.query('select public.delete_push_subscription($1)', [ENDPOINT])
      await tx.exec('reset role')
      expect((await tx.query('select 1 from public.push_subscriptions')).rows).toHaveLength(1)
      await tx.exec('set local role authenticated')
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [owner])
      await tx.query('select public.delete_push_subscription($1)', [ENDPOINT])
      await tx.exec('reset role')
      expect((await tx.query('select 1 from public.push_subscriptions')).rows).toHaveLength(0)
    })
  })

  it('gives the API no direct write access', async () => {
    await asUser(db, owner, async (tx) => {
      await expect(
        tx.query(`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)`, [
          owner,
          ENDPOINT,
          P256DH,
          AUTH,
        ]),
      ).rejects.toThrow(/permission denied/)
    })
  })
})
