// Maps Supabase rows to readonly domain types, validating every value the database
// stores as plain text so a schema drift fails loudly instead of rendering bad data.
import type { Tables } from '@/types/database'
import {
  CATEGORIES,
  type Account,
  type AccountType,
  type Budget,
  type BudgetCategory,
  type CardTier,
  type Category,
  type CreditCard,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
} from '@/types/bank'
import { asCents } from './money'

function oneOf<T extends string>(allowed: readonly T[], value: string, field: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new TypeError(`Unexpected ${field}: ${value}`)
  return value as T
}

const ACCOUNT_TYPES: readonly AccountType[] = ['checking', 'vault']
const CARD_TIERS: readonly CardTier[] = ['black', 'platinum', 'corporate']
const STATUSES: readonly TransactionStatus[] = ['completed', 'pending', 'flagged']
const TYPES: readonly TransactionType[] = ['debit', 'credit']
const BUDGET_CATEGORIES = CATEGORIES.filter((c): c is BudgetCategory => c !== 'transfer')

export function toAccount(row: Tables<'account_balances'>): Account {
  return {
    id: row.id,
    name: row.name,
    type: oneOf(ACCOUNT_TYPES, row.kind, 'account kind'),
    ledgerBalance: asCents(row.ledger_balance_cents),
    availableBalance: asCents(row.available_balance_cents),
    currency: oneOf(['USD'] as const, row.currency, 'currency'),
    apyBps: row.apy_bps,
    createdAt: row.created_at,
  }
}

export function toTransaction(row: Tables<'transactions'>): Transaction {
  if (row.amount_cents <= 0) throw new RangeError(`Transaction amounts must be positive: ${row.amount_cents}`)
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.created_at,
    merchant: row.description,
    amount: asCents(row.amount_cents),
    category: oneOf<Category>(CATEGORIES, row.category, 'category'),
    status: oneOf(STATUSES, row.status, 'status'),
    type: oneOf(TYPES, row.type, 'transaction type'),
    transferId: row.transfer_id,
  }
}

export function toCard(row: Tables<'cards'>): CreditCard {
  if (!/^\d{4}$/.test(row.last4)) throw new TypeError('Cards may only expose the last four digits')
  return {
    id: row.id,
    accountId: row.account_id,
    cardHolder: row.card_holder,
    last4: row.last4,
    expiry: row.expiry,
    limit: asCents(row.limit_cents),
    spent: asCents(row.spent_cents),
    tier: oneOf(CARD_TIERS, row.tier, 'card tier'),
    isFrozen: row.is_frozen,
  }
}

export function toBudget(row: Tables<'budgets'>): Budget {
  return {
    id: row.id,
    category: oneOf(BUDGET_CATEGORIES, row.category, 'budget category'),
    limit: asCents(row.limit_cents),
  }
}
