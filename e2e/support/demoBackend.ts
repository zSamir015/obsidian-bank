import type { Page, Route } from '@playwright/test'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const CHECKING_ID = '00000000-0000-4000-8000-0000000000a1'
const VAULT_ID = '00000000-0000-4000-8000-0000000000a2'
const CARD_ID = '00000000-0000-4000-8000-0000000000c1'
const BUDGET_ID = '00000000-0000-4000-8000-0000000000b1'
const ACCESS_TOKEN =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjQwMDAwMDAwMDAsInN1YiI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDAwMSJ9.signature'

type Row = Record<string, string | number | boolean | null>

const now = new Date()
const daysAgo = (days: number) => {
  const date = new Date(now)
  date.setDate(date.getDate() - days)
  date.setHours(10, 0, 0, 0)
  return date.toISOString()
}

export class DemoBackend {
  readonly unexpectedRequests: string[] = []
  /** Every request body sent to the mocked Supabase host, to check what leaves the browser. */
  readonly requestBodies: string[] = []
  readonly accounts: Row[] = [
    {
      id: CHECKING_ID,
      user_id: USER_ID,
      name: 'Everyday Checking',
      kind: 'checking',
      ledger_balance_cents: 1393894,
      available_balance_cents: 1264055,
      currency: 'USD',
      apy_bps: 0,
      created_at: daysAgo(90),
    },
    {
      id: VAULT_ID,
      user_id: USER_ID,
      name: 'Obsidian Vault',
      kind: 'vault',
      ledger_balance_cents: 3557252,
      available_balance_cents: 3557252,
      currency: 'USD',
      apy_bps: 425,
      created_at: daysAgo(90),
    },
  ]
  readonly cards: Row[] = [
    {
      id: CARD_ID,
      user_id: USER_ID,
      account_id: CHECKING_ID,
      card_holder: 'OBSIDIAN MEMBER',
      last4: '4821',
      expiry: '10/29',
      tier: 'black',
      limit_cents: 5000000,
      spent_cents: 1284750,
      is_frozen: false,
      created_at: daysAgo(90),
    },
  ]
  readonly transactions: Row[] = [
    this.transaction(1, 'Uber', 8940, 'debit', 'travel', daysAgo(0), 'pending'),
    this.transaction(2, 'Amazon Web Services', 21900, 'debit', 'corporate', daysAgo(1), 'pending'),
    this.transaction(3, 'Unrecognized merchant — online', 98999, 'debit', 'services', daysAgo(2), 'flagged'),
    this.transaction(4, 'Delta Air Lines', 41280, 'debit', 'travel', daysAgo(3)),
    this.transaction(5, 'Payroll — Obsidian Labs Inc.', 412500, 'credit', 'payroll', daysAgo(4)),
  ]
  readonly budgets: Row[] = [{ id: BUDGET_ID, user_id: USER_ID, category: 'travel', limit_cents: 120000 }]

  private transfer(fromId: string, toId: string, cents: number) {
    const from = this.accounts.find((account) => account.id === fromId)
    const to = this.accounts.find((account) => account.id === toId)
    if (!from || !to || cents <= 0 || Number(from.available_balance_cents) < cents) {
      throw new Error('Invalid mocked transfer request')
    }
    from.ledger_balance_cents = Number(from.ledger_balance_cents) - cents
    from.available_balance_cents = Number(from.available_balance_cents) - cents
    to.ledger_balance_cents = Number(to.ledger_balance_cents) + cents
    to.available_balance_cents = Number(to.available_balance_cents) + cents
  }

  private transaction(
    id: number,
    description: string,
    amount: number,
    type: 'debit' | 'credit',
    category: string,
    created_at: string,
    status = 'completed',
    account_id = CHECKING_ID,
  ): Row {
    return {
      id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
      user_id: USER_ID,
      account_id,
      amount_cents: amount,
      type,
      category,
      description,
      status,
      transfer_id: null,
      created_at,
    }
  }

  private async fulfill(route: Route, body: unknown, status = 200) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }

  async route(page: Page) {
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname !== 'placeholder.supabase.co') {
        if (url.hostname.endsWith('.supabase.co')) {
          this.unexpectedRequests.push(url.href)
          await route.abort()
          return
        }
        await route.continue()
        return
      }

      const path = url.pathname
      const postData = route.request().postData()
      if (postData) this.requestBodies.push(postData)
      if (path === '/auth/v1/signup') {
        await this.fulfill(route, {
          access_token: ACCESS_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 4_000_000_000,
          refresh_token: 'local-e2e-refresh-token',
          user: {
            id: USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            is_anonymous: true,
            app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        })
        return
      }

      if (path.startsWith('/auth/v1/') && path !== '/auth/v1/token') {
        this.unexpectedRequests.push(url.href)
        await this.fulfill(route, { message: 'Unexpected auth request' }, 404)
        return
      }
      if (path === '/auth/v1/token') {
        await this.fulfill(route, {
          access_token: ACCESS_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 4_000_000_000,
          refresh_token: 'local-e2e-refresh-token',
          user: {
            id: USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            is_anonymous: true,
            app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        })
        return
      }

      if (path === '/rest/v1/account_balances' && route.request().method() === 'GET') {
        await this.fulfill(route, this.accounts)
        return
      }
      if (path === '/rest/v1/cards' && route.request().method() === 'GET') {
        await this.fulfill(route, this.cards)
        return
      }
      if (path === '/rest/v1/transactions' && route.request().method() === 'GET') {
        await this.fulfill(route, this.transactions)
        return
      }
      if (path === '/rest/v1/budgets') {
        if (route.request().method() === 'GET') {
          await this.fulfill(route, this.budgets)
          return
        }
        const body = route.request().postDataJSON() as Row
        if (route.request().method() === 'POST') {
          const created: Row = {
            id: '00000000-0000-4000-8000-0000000000b2',
            ...body,
          }
          this.budgets.push(created)
          await this.fulfill(route, [created], 201)
          return
        }
        if (route.request().method() === 'PATCH') {
          const id = url.searchParams.get('id')?.replace('eq.', '')
          const row = this.budgets.find((budget) => budget.id === id)
          if (row) row.limit_cents = body.limit_cents as number
          await route.fulfill({ status: 204, body: '' })
          return
        }
      }

      if (path === '/rest/v1/rpc/transfer_funds') {
        const body = route.request().postDataJSON() as Row
        const cents = Number(body.p_amount_cents)
        this.transfer(String(body.p_from), String(body.p_to), cents)
        await this.fulfill(route, '00000000-0000-4000-8000-0000000000f1')
        return
      }
      if (path === '/rest/v1/rpc/settle_external_transfers') {
        await this.fulfill(route, 0)
        return
      }
      if (path === '/rest/v1/rpc/create_external_transfer') {
        const body = route.request().postDataJSON() as Row
        const cents = Number(body.p_amount_cents)
        const from = this.accounts.find((account) => account.id === body.p_from)
        if (!from || !/^\d{4}$/.test(String(body.p_account_last4)) || cents <= 0) {
          throw new Error('Invalid mocked external transfer request')
        }
        from.available_balance_cents = Number(from.available_balance_cents) - cents
        this.transactions.unshift({
          ...this.transaction(
            90,
            `${String(body.p_recipient_name)} ••${String(body.p_account_last4)}`,
            cents,
            'debit',
            'external',
            new Date().toISOString(),
            'pending',
          ),
          account_id: String(body.p_from),
        })
        await this.fulfill(route, '00000000-0000-4000-8000-0000000000e1')
        return
      }
      if (path === '/rest/v1/rpc/freeze_card') {
        const body = route.request().postDataJSON() as Row
        const card = this.cards.find((item) => item.id === body.p_card_id)
        if (!card) {
          await this.fulfill(route, { message: 'card_not_found' }, 404)
          return
        }
        card.is_frozen = Boolean(body.p_frozen)
        await this.fulfill(route, card.is_frozen)
        return
      }
      if (path === '/rest/v1/rpc/update_card_limit') {
        const body = route.request().postDataJSON() as Row
        const card = this.cards.find((item) => item.id === body.p_card_id)
        if (!card) {
          await this.fulfill(route, { message: 'card_not_found' }, 404)
          return
        }
        card.limit_cents = Number(body.p_new_limit_cents)
        await this.fulfill(route, card.limit_cents)
        return
      }

      this.unexpectedRequests.push(url.href)
      await this.fulfill(route, { message: 'Unexpected mocked backend request' }, 404)
    })
  }
}
