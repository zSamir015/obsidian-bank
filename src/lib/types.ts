export const CATEGORIES = [
  'income',
  'salary',
  'housing',
  'groceries',
  'dining',
  'transport',
  'entertainment',
  'shopping',
  'utilities',
  'health',
  'transfer',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  income: 'Ingresos',
  salary: 'Nómina',
  housing: 'Vivienda',
  groceries: 'Supermercado',
  dining: 'Restaurantes',
  transport: 'Transporte',
  entertainment: 'Ocio',
  shopping: 'Compras',
  utilities: 'Suministros',
  health: 'Salud',
  transfer: 'Transferencia',
}

export type AccountKind = 'checking' | 'savings'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  balance_cents: number
  currency: string
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  amount_cents: number
  category: Category
  description: string
  transfer_id: string | null
  created_at: string
}

export interface Budget {
  id: string
  category: Category
  limit_cents: number
}
