import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Account, Budget, Transaction } from '../lib/types'

export const queryKeys = {
  accounts: ['accounts'] as const,
  transactions: ['transactions'] as const,
  budgets: ['budgets'] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, kind, balance_cents, currency, created_at')
        .order('kind')
      if (error) throw error
      return data
    },
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, account_id, amount_cents, category, description, transfer_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from('budgets').select('id, category, limit_cents').order('category')
      if (error) throw error
      return data as Budget[]
    },
  })
}

export interface TransferInput {
  fromId: string
  toId: string
  amountCents: number
  description: string
}

export function useTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromId, toId, amountCents, description }: TransferInput) => {
      const { data, error } = await supabase.rpc('transfer_funds', {
        p_from: fromId,
        p_to: toId,
        p_amount_cents: amountCents,
        p_description: description,
      })
      if (error) throw new Error(error.message)
      return data as string
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
    mutationFn: async ({ id, limitCents }: { id: string; limitCents: number }) => {
      const { error } = await supabase.from('budgets').update({ limit_cents: limitCents }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.budgets }),
  })
}
