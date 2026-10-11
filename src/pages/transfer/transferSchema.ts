import { z } from 'zod'
import type { Messages } from '@/i18n/messages/en'
import { getMessages } from '@/i18n/runtime'
import { formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'

export function makeTransferSchema(accounts: readonly Account[], t: Messages = getMessages()) {
  const v = t.validation
  return z
    .object({
      fromId: z.string().min(1, v.chooseFrom),
      toId: z.string().min(1, v.chooseTo),
      amount: z.string().trim().min(1, v.enterAmount),
      description: z.string().trim().max(140, v.noteTooLong),
    })
    .superRefine((values, ctx) => {
      if (values.fromId && values.fromId === values.toId) {
        ctx.addIssue({ code: 'custom', path: ['toId'], message: v.differentAccount })
      }
      if (!values.amount) return
      const cents = parseCents(values.amount)
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: v.amountFormat })
        return
      }
      const from = accounts.find((a) => a.id === values.fromId)
      if (from && cents > from.availableBalance) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: v.overAvailable(formatMoney(from.availableBalance)),
        })
      }
    })
}

export type TransferFormValues = z.infer<ReturnType<typeof makeTransferSchema>>
