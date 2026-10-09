import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toAccount, toBudget, toCard, toTransaction } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { Account, Budget, BudgetCategory, Cents, CreditCard, Transaction } from '@/types/bank'

export const queryKeys = {
  accounts: ['accounts'] as const,
  cards: ['cards'] as const,
  transactions: ['transactions'] as const,
  budgets: ['budgets'] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase.from('accounts').select('*').order('kind')
      if (error) throw error
      return data.map(toAccount)
    },
  })
}

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: async (): Promise<CreditCard[]> => {
      const { data, error } = await supabase.from('cards').select('*').order('created_at')
      if (error) throw error
      return data.map(toCard)
    },
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data.map(toTransaction)
    },
  })
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from('budgets').select('*').order('category')
      if (error) throw error
      return data.map(toBudget)
    },
  })
}

export interface TransferInput {
  readonly fromId: string
  readonly toId: string
  readonly amount: Cents
  readonly description: string
}

export function useTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromId, toId, amount, description }: TransferInput) => {
      const { data, error } = await supabase.rpc('transfer_funds', {
        p_from: fromId,
        p_to: toId,
        p_amount_cents: amount,
        p_description: description,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, limit }: { readonly id: string; readonly limit: Cents }) => {
      const { error } = await supabase.from('budgets').update({ limit_cents: limit }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.budgets }),
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ category, limit }: { readonly category: BudgetCategory; readonly limit: Cents }) => {
      // RLS only accepts rows for the signed-in user, so user_id must be the session's.
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) throw new Error('not_authenticated')
      const { error } = await supabase.from('budgets').insert({ user_id: userId, category, limit_cents: limit })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.budgets }),
  })
}
