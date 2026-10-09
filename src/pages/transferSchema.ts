import { z } from 'zod'
import { formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'

export function makeTransferSchema(accounts: readonly Account[]) {
  return z
    .object({
      fromId: z.string().min(1, 'Elige la cuenta de origen'),
      toId: z.string().min(1, 'Elige la cuenta de destino'),
      amount: z.string().trim().min(1, 'Introduce un importe'),
      description: z.string().trim().max(140, 'Máximo 140 caracteres'),
    })
    .superRefine((values, ctx) => {
      if (values.fromId && values.fromId === values.toId) {
        ctx.addIssue({ code: 'custom', path: ['toId'], message: 'Elige una cuenta distinta a la de origen' })
      }
      if (!values.amount) return
      const cents = parseCents(values.amount)
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Importe no válido (ej.: 25.50)' })
        return
      }
      const from = accounts.find((a) => a.id === values.fromId)
      if (from && cents > from.balance) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `Saldo insuficiente. Disponible: ${formatMoney(from.balance)}`,
        })
      }
    })
}

export type TransferFormValues = z.infer<ReturnType<typeof makeTransferSchema>>
