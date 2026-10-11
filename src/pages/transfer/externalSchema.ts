import { z } from 'zod'
import { isValidRoutingNumber } from '@/lib/aba'
import type { Messages } from '@/i18n/messages/en'
import { getMessages } from '@/i18n/runtime'
import { asCents, formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'

/** Same limits as create_external_transfer (migration 007). The 24-hour limit is checked on the server. */
export const EXTERNAL_PER_TRANSFER_LIMIT = asCents(1_000_000)
export const EXTERNAL_DAILY_LIMIT = asCents(2_500_000)

export function makeExternalTransferSchema(accounts: readonly Account[], t: Messages = getMessages()) {
  const v = t.validation
  return z
    .object({
      fromId: z.string().min(1, v.chooseSendFrom),
      recipientName: z.string().trim().min(1, v.recipientRequired).max(70, v.recipientTooLong),
      routingNumber: z.string().trim(),
      /** Set by the account number field once it has been validated; never the full number. */
      accountLast4: z.string().regex(/^\d{4}$/, v.accountNumberRequired),
      amount: z.string().trim().min(1, v.enterAmount),
      note: z.string().trim().max(140, v.noteTooLong),
    })
    .superRefine((values, ctx) => {
      if (!values.routingNumber) {
        ctx.addIssue({ code: 'custom', path: ['routingNumber'], message: v.routingRequired })
      } else if (!/^\d{9}$/.test(values.routingNumber)) {
        ctx.addIssue({ code: 'custom', path: ['routingNumber'], message: v.routingFormat })
      } else if (!isValidRoutingNumber(values.routingNumber)) {
        ctx.addIssue({ code: 'custom', path: ['routingNumber'], message: v.routingChecksum })
      }

      if (!values.amount) return
      const cents = parseCents(values.amount)
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: v.amountFormat })
        return
      }
      if (cents > EXTERNAL_PER_TRANSFER_LIMIT) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: v.perTransferLimit(formatMoney(EXTERNAL_PER_TRANSFER_LIMIT)),
        })
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

export type ExternalTransferFormValues = z.infer<ReturnType<typeof makeExternalTransferSchema>>
