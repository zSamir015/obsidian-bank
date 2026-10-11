import { z } from 'zod'
import { isValidRoutingNumber } from '@/lib/aba'
import { asCents, formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'

/** Same limits as create_external_transfer (migration 007). The 24-hour limit is checked on the server. */
export const EXTERNAL_PER_TRANSFER_LIMIT = asCents(1_000_000)
export const EXTERNAL_DAILY_LIMIT = asCents(2_500_000)

export function makeExternalTransferSchema(accounts: readonly Account[]) {
  return z
    .object({
      fromId: z.string().min(1, 'Choose the account to send from.'),
      recipientName: z
        .string()
        .trim()
        .min(1, "Enter the recipient's name.")
        .max(70, 'Keep the name under 70 characters.'),
      routingNumber: z.string().trim(),
      /** Set by the account number field once it has been validated; never the full number. */
      accountLast4: z.string().regex(/^\d{4}$/, "Enter the recipient's account number, 4 to 17 digits."),
      amount: z.string().trim().min(1, 'Enter an amount.'),
      note: z.string().trim().max(140, 'Keep the note under 140 characters.'),
    })
    .superRefine((values, ctx) => {
      if (!values.routingNumber) {
        ctx.addIssue({ code: 'custom', path: ['routingNumber'], message: 'Enter the 9-digit routing number.' })
      } else if (!/^\d{9}$/.test(values.routingNumber)) {
        ctx.addIssue({ code: 'custom', path: ['routingNumber'], message: 'Routing numbers have exactly 9 digits.' })
      } else if (!isValidRoutingNumber(values.routingNumber)) {
        ctx.addIssue({
          code: 'custom',
          path: ['routingNumber'],
          message: "That isn't a valid US routing number. Check the 9 digits.",
        })
      }

      if (!values.amount) return
      const cents = parseCents(values.amount)
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount like 25.50, greater than $0.00.' })
        return
      }
      if (cents > EXTERNAL_PER_TRANSFER_LIMIT) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `External transfers are limited to ${formatMoney(EXTERNAL_PER_TRANSFER_LIMIT)} each.`,
        })
        return
      }
      const from = accounts.find((a) => a.id === values.fromId)
      if (from && cents > from.availableBalance) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `That's more than this account has available. Available: ${formatMoney(from.availableBalance)}.`,
        })
      }
    })
}

export type ExternalTransferFormValues = z.infer<ReturnType<typeof makeExternalTransferSchema>>
