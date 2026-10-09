// Domain model. Every type is readonly: state is replaced, never mutated.
// Money is always integer cents branded as Cents; build them with toCents/asCents from '@/lib/money'.

export type Cents = number & { readonly __brand: 'Cents' }

export type AccountType = 'checking' | 'vault'
export type Currency = 'USD'

export interface Account {
  readonly id: string
  readonly name: string
  readonly type: AccountType
  readonly balance: Cents
  readonly currency: Currency
  /** Annual percentage yield in basis points (425 = 4.25%). */
  readonly apyBps: number
  readonly createdAt: string
}

export type CardTier = 'black' | 'platinum' | 'corporate'

/** Only the last four digits are ever stored or handled: never the full card number or CVV. */
export interface CreditCard {
  readonly id: string
  readonly accountId: string
  readonly cardHolder: string
  readonly last4: string
  /** MM/YY */
  readonly expiry: string
  readonly limit: Cents
  readonly spent: Cents
  readonly tier: CardTier
  readonly isFrozen: boolean
}

export const CATEGORIES = ['corporate', 'travel', 'services', 'payroll', 'transfer'] as const
export type Category = (typeof CATEGORIES)[number]

/** Movements between the user's own accounts: never budgeted, never counted as income or spending. */
export type BudgetCategory = Exclude<Category, 'transfer'>

export type TransactionStatus = 'completed' | 'pending' | 'flagged'
export type TransactionType = 'debit' | 'credit'

export interface Transaction {
  readonly id: string
  readonly accountId: string
  /** ISO 8601 */
  readonly date: string
  readonly merchant: string
  /** Always positive; direction is given by type. */
  readonly amount: Cents
  readonly category: Category
  readonly status: TransactionStatus
  readonly type: TransactionType
  readonly transferId: string | null
}

export interface Budget {
  readonly id: string
  readonly category: BudgetCategory
  readonly limit: Cents
}
