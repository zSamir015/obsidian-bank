import { useEffect, useRef, useState } from 'react'
import { Input, type ControlProps } from '@/components/ui/form'
import { lastFourOfAccountNumber } from '@/lib/aba'

/**
 * The recipient's account number. The full number only exists in this input while it is being
 * typed: on blur (or Enter) it is checked, replaced by its last four digits and cleared, so it never
 * reaches form state, the query cache, storage or a request.
 */
export function AccountNumberField({
  control,
  last4,
  onLast4Change,
  onFormatError,
}: {
  readonly control: ControlProps
  readonly last4: string
  readonly onLast4Change: (last4: string) => void
  /** A message when the typed value isn't 4 to 17 digits, or null once it is fixed. */
  readonly onFormatError: (message: string | null) => void
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const focusInput = useRef(false)

  useEffect(() => {
    if (!last4 && focusInput.current) {
      focusInput.current = false
      inputRef.current?.focus()
    }
  }, [last4])

  function commit() {
    if (!draft.trim()) {
      onFormatError(null)
      return
    }
    const lastFour = lastFourOfAccountNumber(draft)
    if (lastFour) {
      setDraft('')
      onFormatError(null)
      onLast4Change(lastFour)
    } else {
      onFormatError('Account numbers have 4 to 17 digits.')
    }
  }

  if (last4) {
    return (
      <div className="flex items-center gap-2">
        <Input {...control} readOnly value={`Ending in ${last4}`} className="tabular-nums" />
        <button
          type="button"
          aria-label="Change account number"
          onClick={() => {
            focusInput.current = true
            onLast4Change('')
          }}
          className="h-12 shrink-0 rounded-full border border-hairline px-5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <Input
      {...control}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={21}
      placeholder="4 to 17 digits"
      className="font-mono"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        // Mask first, then submit explicitly: the input is gone by the time a default submit would run.
        event.preventDefault()
        commit()
        event.currentTarget.form?.requestSubmit()
      }}
    />
  )
}
