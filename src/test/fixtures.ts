// Demo rows shaped like Supabase responses (after migration 002). Used by component tests
// and by the screenshot script, which serves them in place of the real API.
import type { Tables } from '@/types/database'

const USER = '00000000-0000-4000-8000-000000000001'
const CHECKING = '00000000-0000-4000-8000-0000000000a1'
const VAULT = '00000000-0000-4000-8000-0000000000a2'

const daysAgo = (days: number, hours = 10) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hours, 0, 0, 0)
  return date.toISOString()
}

export const accountRows: Tables<'account_balances'>[] = [
  {
    id: CHECKING,
    user_id: USER,
    name: 'Everyday Checking',
    kind: 'checking',
    ledger_balance_cents: 1393894,
    available_balance_cents: 1264055,
    currency: 'USD',
    apy_bps: 0,
    created_at: daysAgo(90),
  },
  {
    id: VAULT,
    user_id: USER,
    name: 'Obsidian Vault',
    kind: 'vault',
    ledger_balance_cents: 3557252,
    available_balance_cents: 3557252,
    currency: 'USD',
    apy_bps: 425,
    created_at: daysAgo(90),
  },
]

export const cardRows: Tables<'cards'>[] = [
  {
    id: '00000000-0000-4000-8000-0000000000c1',
    user_id: USER,
    account_id: CHECKING,
    card_holder: 'OBSIDIAN MEMBER',
    last4: '4821',
    expiry: '10/29',
    tier: 'black',
    limit_cents: 5000000,
    spent_cents: 1284750,
    is_frozen: false,
    created_at: daysAgo(90),
  },
  {
    id: '00000000-0000-4000-8000-0000000000c2',
    user_id: USER,
    account_id: CHECKING,
    card_holder: 'OBSIDIAN MEMBER',
    last4: '0937',
    expiry: '04/28',
    tier: 'platinum',
    limit_cents: 1500000,
    spent_cents: 312040,
    is_frozen: true,
    created_at: daysAgo(90),
  },
]

const tx = (
  n: number,
  description: string,
  amount_cents: number,
  type: 'debit' | 'credit',
  category: string,
  created_at: string,
  status = 'completed',
  account_id = CHECKING,
): Tables<'transactions'> => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  user_id: USER,
  account_id,
  amount_cents,
  type,
  category,
  description,
  status,
  transfer_id: null,
  created_at,
})

// Kept within the current month so "this month" figures are stable whatever the date.
const today = new Date().getDate()
const thisMonth = (day: number, hours = 10) => daysAgo(Math.min(day, today - 1), hours)

export const transactionRows: Tables<'transactions'>[] = [
  tx(1, 'Uber', 8940, 'debit', 'travel', daysAgo(0, 1), 'pending'),
  tx(2, 'Amazon Web Services', 21900, 'debit', 'corporate', thisMonth(1, 9), 'pending'),
  tx(3, 'Unrecognized merchant — online', 98999, 'debit', 'services', thisMonth(2), 'flagged'),
  tx(4, 'Delta Air Lines', 41280, 'debit', 'travel', thisMonth(3)),
  tx(5, 'Payroll — Obsidian Labs Inc.', 412500, 'credit', 'payroll', thisMonth(4)),
  tx(6, 'Figma', 4500, 'debit', 'corporate', thisMonth(5)),
  tx(7, 'Con Edison', 13420, 'debit', 'services', thisMonth(6)),
  tx(8, 'Marriott Bonvoy', 62310, 'debit', 'travel', thisMonth(7)),
]

// Travel ends up at ~94% of its budget, services at ~56%; corporate has no budget.
export const budgetRows: Tables<'budgets'>[] = [
  { id: '00000000-0000-4000-8000-0000000000b1', user_id: USER, category: 'travel', limit_cents: 120000 },
  { id: '00000000-0000-4000-8000-0000000000b2', user_id: USER, category: 'services', limit_cents: 200000 },
]
