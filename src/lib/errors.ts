import { getMessages } from '@/i18n/runtime'
import type { Messages } from '@/i18n/messages/en'

// Maps server error codes (transfer_funds, create_external_transfer, freeze_card, update_card_limit) to messages that
// say what happened and how to fix it.
type ErrorCode = Exclude<keyof Messages['errors'], 'fallback' | 'actions'>
export type ErrorAction = keyof Messages['errors']['actions']

export function toFriendlyMessage(error: unknown, action: ErrorAction = 'transfer'): string {
  const { errors } = getMessages()
  const message = error instanceof Error ? error.message : String(error)
  const codes = Object.keys(errors).filter((key): key is ErrorCode => key !== 'fallback' && key !== 'actions')
  const known = codes.find((code) => message.includes(code))
  return known ? errors[known] : errors.fallback(errors.actions[action])
}
