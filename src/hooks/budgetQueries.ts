import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toBudget } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { Budget, BudgetCategory, Cents } from '@/types/bank'
import { queryKeys } from './queryKeys'

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
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) throw new Error('not_authenticated')
      const { error } = await supabase.from('budgets').insert({ user_id: userId, category, limit_cents: limit })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.budgets }),
  })
}
