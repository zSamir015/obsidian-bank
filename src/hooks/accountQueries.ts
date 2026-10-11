import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toAccount } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/bank'
import { queryKeys } from './queryKeys'
import { settleDueTransfers } from './settlement'

export function useAccounts() {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<Account[]> => {
      void settleDueTransfers(queryClient)
      const { data, error } = await supabase.from('account_balances').select('*').order('kind')
      if (error) throw error
      return data.map(toAccount)
    },
  })
}
