import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Cents } from '@/types/bank'
import { queryKeys } from './queryKeys'

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
