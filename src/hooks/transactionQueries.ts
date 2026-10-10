import { useQuery } from '@tanstack/react-query'
import { toTransaction } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/bank'
import { queryKeys } from './queryKeys'

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
