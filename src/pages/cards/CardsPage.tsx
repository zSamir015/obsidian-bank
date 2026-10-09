import { Snowflake } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, MoneyInput } from '@/components/ui/form'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCards, useFreezeCard, useUpdateCardLimit } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import { toFriendlyMessage } from '@/lib/errors'
import { CARD_TIER_LABELS } from '@/lib/labels'
import { asCents, formatMoney } from '@/lib/money'
import type { CreditCard } from '@/types/bank'
import { CardVisual } from './CardVisual'
import { validateCardLimit } from './limit'

const cardName = (card: CreditCard) => `${CARD_TIER_LABELS[card.tier]} •••• ${card.last4}`

export default function CardsPage() {
  const cards = useCards()
  const [selectedId, setSelectedId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const card = cards.data?.find((c) => c.id === selectedId) ?? cards.data?.[0]

  return (
    <>
      <PageHeader title="Cards">Freeze a card or change its limit. Changes apply right away.</PageHeader>
      {cards.isError ? (
        <ErrorMessage onRetry={() => void cards.refetch()}>Couldn't load your cards.</ErrorMessage>
      ) : cards.isPending ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="aspect-[85.6/53.98] max-w-[520px] rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : !card ? (
        <p className="text-muted">You don't have any cards yet.</p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="min-w-0">
            <fieldset>
              <legend className="sr-only">Card</legend>
              <div role="radiogroup" aria-label="Card" className="mb-8 flex flex-wrap gap-2">
                {cards.data.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-sm text-muted transition-colors hover:text-text',
                      'has-[:checked]:bg-surface-2 has-[:checked]:text-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text',
                    )}
                  >
                    <input
                      type="radio"
                      name="card"
                      value={c.id}
                      aria-label={cardName(c)}
                      checked={c.id === card.id}
                      onChange={() => {
                        setSelectedId(c.id)
                        setAnnouncement('')
                      }}
                      className="sr-only"
                    />
                    {CARD_TIER_LABELS[c.tier]} <span className="font-mono">•••• {c.last4}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <CardVisual key={card.id} card={card} />
          </div>
          <CardControls key={card.id} card={card} onResult={setAnnouncement} />
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-8 text-sm text-muted">
        {announcement}
      </p>
    </>
  )
}

function CardControls({ card, onResult }: { readonly card: CreditCard; readonly onResult: (message: string) => void }) {
  const freeze = useFreezeCard()
  const [freezeError, setFreezeError] = useState<string>()
  const [editing, setEditing] = useState(false)
  const name = `${CARD_TIER_LABELS[card.tier]} card ending in ${card.last4}`

  async function toggleFreeze() {
    const frozen = !card.isFrozen
    setFreezeError(undefined)
    try {
      await freeze.mutateAsync({ cardId: card.id, frozen })
      onResult(`${name} ${frozen ? 'frozen' : 'unfrozen'}.`)
    } catch (error) {
      setFreezeError(toFriendlyMessage(error, 'update the card'))
    }
  }

  return (
    <section aria-label={`${name} settings`} className="rounded-card border border-hairline bg-sunken p-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
        <div>
          <dt className="text-muted">Spent</dt>
          <dd className="mt-1 text-lg">
            <Money cents={card.spent} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Credit limit</dt>
          <dd className="mt-1 text-lg">
            <Money cents={card.limit} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Available</dt>
          <dd className="mt-1">
            <Money cents={asCents(card.limit - card.spent)} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Expires</dt>
          <dd className="mt-1 font-mono">{card.expiry}</dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-hairline pt-6">
        <Label>Card status</Label>
        <p className="mt-1.5 text-sm">{card.isFrozen ? 'Frozen: new payments are declined.' : 'Active.'}</p>
        <Button
          variant="secondary"
          className="mt-4"
          aria-pressed={card.isFrozen}
          loading={freeze.isPending}
          onClick={() => void toggleFreeze()}
        >
          <Snowflake aria-hidden="true" className="size-4" />
          {card.isFrozen ? 'Unfreeze card' : 'Freeze card'}
        </Button>
        {freezeError && (
          <div className="mt-4">
            <ErrorMessage>{freezeError}</ErrorMessage>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-hairline pt-6">
        <Label>Limit</Label>
        {editing ? (
          <LimitForm
            card={card}
            onDone={(cents) => {
              setEditing(false)
              if (cents !== undefined) onResult(`Limit updated to ${formatMoney(cents)}.`)
            }}
          />
        ) : (
          <Button variant="secondary" className="mt-4" onClick={() => setEditing(true)}>
            Change limit
          </Button>
        )}
      </div>
    </section>
  )
}

function LimitForm({
  card,
  onDone,
}: {
  readonly card: CreditCard
  readonly onDone: (cents?: ReturnType<typeof asCents>) => void
}) {
  const update = useUpdateCardLimit()
  // Limits are whole dollars, so the cents part is always zero.
  const [draft, setDraft] = useState(String(Math.trunc(card.limit / 100)))
  const [error, setError] = useState<string>()

  async function save() {
    const check = validateCardLimit(draft, card.spent)
    if (!check.ok) return setError(check.error)
    try {
      await update.mutateAsync({ cardId: card.id, limit: check.cents })
      onDone(check.cents)
    } catch (err) {
      setError(toFriendlyMessage(err, 'update the limit'))
    }
  }

  return (
    <form
      noValidate
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <Field
        label="New credit limit"
        hint={`Whole dollars from $500 to $100,000, and at least ${formatMoney(card.spent)} already spent.`}
        error={error}
      >
        {(props) => (
          <MoneyInput
            {...props}
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(undefined)
            }}
          />
        )}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={update.isPending}>
          Save limit
        </Button>
        <Button variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
