import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toCard } from '@/lib/mappers'
import { asCents } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import type { Cents, CreditCard } from '@/types/bank'
import { queryKeys } from './queryKeys'

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

const replaceCard = (cards: readonly CreditCard[] | undefined, id: string, change: Partial<CreditCard>) =>
  cards?.map((card) => (card.id === id ? { ...card, ...change } : card))

/** Freezes or unfreezes a card. The new state shows immediately and rolls back on error. */
export function useFreezeCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cardId, frozen }: { readonly cardId: string; readonly frozen: boolean }) => {
      const { data, error } = await supabase.rpc('freeze_card', { p_card_id: cardId, p_frozen: frozen })
      if (error) throw new Error(error.message)
      return data
    },
    onMutate: async ({ cardId, frozen }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards })
      const previous = queryClient.getQueryData<readonly CreditCard[]>(queryKeys.cards)
      queryClient.setQueryData(queryKeys.cards, replaceCard(previous, cardId, { isFrozen: frozen }))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.cards, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.cards }),
  })
}

/** Changes a card's limit. The cache updates only once the server confirms it. */
export function useUpdateCardLimit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cardId, limit }: { readonly cardId: string; readonly limit: Cents }) => {
      const { data, error } = await supabase.rpc('update_card_limit', { p_card_id: cardId, p_new_limit_cents: limit })
      if (error) throw new Error(error.message)
      return asCents(data)
    },
    onSuccess: (limit, { cardId }) => {
      queryClient.setQueryData(
        queryKeys.cards,
        replaceCard(queryClient.getQueryData<readonly CreditCard[]>(queryKeys.cards), cardId, { limit }),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards })
    },
  })
}
