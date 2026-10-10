import { RotateCw, Snowflake } from 'lucide-react'
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
import { asCents, formatDollars, formatMoney } from '@/lib/money'
import type { CreditCard } from '@/types/bank'
import { CardVisual } from './CardVisual'
import { minimumLimit, validateCardLimit } from './limit'
import type { Face } from './motion'

const cardName = (card: CreditCard) => `${CARD_TIER_LABELS[card.tier]} •••• ${card.last4}`

export default function CardsPage() {
  const cards = useCards()
  const [selectedId, setSelectedId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const [face, setFace] = useState<Face>('front')
  const card = cards.data?.find((c) => c.id === selectedId) ?? cards.data?.[0]

  return (
    <>
      <PageHeader title="Cards">Freeze a card or change its limit. Changes apply right away.</PageHeader>
      {cards.isError ? (
        <ErrorMessage onRetry={() => void cards.refetch()}>Couldn't load your cards.</ErrorMessage>
      ) : cards.isPending ? (
        <div className="space-y-8">
          <Skeleton className="h-[clamp(300px,58vw,600px)] rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : !card ? (
        <p className="text-muted">You don't have any cards yet.</p>
      ) : (
        <div className="space-y-8">
          {/* The stage: the card alone, large and centered, with room around it. */}
          <section aria-label="Card preview" className="-mx-5 md:mx-0">
            <div className="flex h-[clamp(300px,58vw,600px)] items-center justify-center px-5 md:px-0">
              <CardVisual key={card.id} card={card} face={face} onFaceChange={setFace} />
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <fieldset className="min-w-0">
              <legend className="sr-only">Card</legend>
              <div
                role="radiogroup"
                aria-label="Card"
                // Mobile: one swipeable row of chips. Wider screens: they wrap if needed.
                className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
              >
                {cards.data.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-sm text-muted transition-colors hover:text-text',
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
                        setFace('front')
                        setAnnouncement('')
                      }}
                      className="sr-only"
                    />
                    {CARD_TIER_LABELS[c.tier]} <span className="font-mono">•••• {c.last4}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              variant="secondary"
              size="sm"
              aria-pressed={face === 'back'}
              onClick={() => setFace(face === 'back' ? 'front' : 'back')}
            >
              <RotateCw aria-hidden="true" className="size-4" />
              {face === 'back' ? 'Show front' : 'Show back'}
            </Button>
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
    <section
      aria-label={`${name} settings`}
      className="grid gap-8 rounded-card border border-hairline bg-sunken p-6 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10"
    >
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

      <div className="border-t border-hairline pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
        <Label>Card status</Label>
        <p className="mt-1.5 text-sm">{card.isFrozen ? 'Frozen: new payments are declined.' : 'Active'}</p>
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

      <div className="border-t border-hairline pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
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
        hint={`Whole dollars from ${formatDollars(minimumLimit(card.spent))} to $100,000.`}
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
