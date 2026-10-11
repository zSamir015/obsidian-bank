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

export interface ExternalTransferInput {
  readonly fromId: string
  readonly amount: Cents
  readonly routingNumber: string
  /** Only the last four digits: the full account number never leaves the browser. */
  readonly accountLast4: string
  readonly recipientName: string
  readonly note: string
}

export function useExternalTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromId, amount, routingNumber, accountLast4, recipientName, note }: ExternalTransferInput) => {
      const { data, error } = await supabase.rpc('create_external_transfer', {
        p_from: fromId,
        p_amount_cents: amount,
        p_routing_number: routingNumber,
        p_account_last4: accountLast4,
        p_recipient_name: recipientName,
        p_note: note,
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
