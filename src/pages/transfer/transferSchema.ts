import { z } from 'zod'
import { formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'

export function makeTransferSchema(accounts: readonly Account[]) {
  return z
    .object({
      fromId: z.string().min(1, 'Choose the account to move money from.'),
      toId: z.string().min(1, 'Choose the account to move money to.'),
      amount: z.string().trim().min(1, 'Enter an amount.'),
      description: z.string().trim().max(140, 'Keep the note under 140 characters.'),
    })
    .superRefine((values, ctx) => {
      if (values.fromId && values.fromId === values.toId) {
        ctx.addIssue({ code: 'custom', path: ['toId'], message: 'Choose a different account from the source.' })
      }
      if (!values.amount) return
      const cents = parseCents(values.amount)
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount like 25.50, greater than $0.00.' })
        return
      }
      const from = accounts.find((a) => a.id === values.fromId)
      if (from && cents > from.balance) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `That's more than this account holds. Available: ${formatMoney(from.balance)}.`,
        })
      }
    })
}

export type TransferFormValues = z.infer<ReturnType<typeof makeTransferSchema>>
