import { RotateCw, Snowflake } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, MoneyInput } from '@/components/ui/form'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCards, useFreezeCard, useUpdateCardLimit } from '@/hooks/cardQueries'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/cn'
import { toFriendlyMessage } from '@/lib/errors'
import { cardTierLabel } from '@/lib/labels'
import { asCents, formatDollars, formatMoney } from '@/lib/money'
import type { Messages } from '@/i18n/messages/en'
import type { CreditCard } from '@/types/bank'
import { CardVisual } from './CardVisual'
import { LIMIT_MAX, minimumLimit, validateCardLimit } from './limit'
import type { Face } from './motion'

const cardName = (card: CreditCard, t: Messages) => `${cardTierLabel(card.tier, t)} •••• ${card.last4}`

export default function CardsPage() {
  const { t } = useI18n()
  const cards = useCards()
  const [selectedId, setSelectedId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const [face, setFace] = useState<Face>('front')
  const card = cards.data?.find((c) => c.id === selectedId) ?? cards.data?.[0]

  return (
    <>
      <PageHeader title={t.cards.title}>{t.cards.intro}</PageHeader>
      {cards.isError ? (
        <ErrorMessage onRetry={() => void cards.refetch()}>{t.cards.failed}</ErrorMessage>
      ) : cards.isPending ? (
        <div className="space-y-8">
          <Skeleton className="h-[clamp(300px,58vw,600px)] rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : !card ? (
        <p className="text-muted">{t.cards.none}</p>
      ) : (
        <div className="space-y-8">
          {/* The stage: the card alone, large and centered, with room around it. */}
          <section aria-label={t.cards.preview} className="-mx-5 md:mx-0">
            <div className="flex h-[clamp(300px,58vw,600px)] items-center justify-center px-5 md:px-0">
              <CardVisual key={card.id} card={card} face={face} onFaceChange={setFace} />
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <fieldset className="min-w-0">
              <legend className="sr-only">{t.cards.card}</legend>
              <div
                role="radiogroup"
                aria-label={t.cards.card}
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
                      aria-label={cardName(c, t)}
                      checked={c.id === card.id}
                      onChange={() => {
                        setSelectedId(c.id)
                        setFace('front')
                        setAnnouncement('')
                      }}
                      className="sr-only"
                    />
                    {cardTierLabel(c.tier, t)} <span className="font-mono">•••• {c.last4}</span>
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
              {face === 'back' ? t.cards.showFront : t.cards.showBack}
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
  const { t } = useI18n()
  const name = t.cards.fullName(cardTierLabel(card.tier, t), card.last4)

  async function toggleFreeze() {
    const frozen = !card.isFrozen
    setFreezeError(undefined)
    try {
      await freeze.mutateAsync({ cardId: card.id, frozen })
      onResult(frozen ? t.cards.frozenResult(name) : t.cards.unfrozenResult(name))
    } catch (error) {
      setFreezeError(toFriendlyMessage(error, 'updateCard'))
    }
  }

  return (
    <section
      aria-label={t.cards.settings(name)}
      className="grid gap-8 rounded-card border border-hairline bg-sunken p-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-10"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
        <div>
          <dt className="text-muted">{t.cards.spent}</dt>
          <dd className="mt-1 text-lg">
            <Money cents={card.spent} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t.cards.creditLimit}</dt>
          <dd className="mt-1 text-lg">
            <Money cents={card.limit} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t.cards.available}</dt>
          <dd className="mt-1">
            <Money cents={asCents(card.limit - card.spent)} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t.cards.expires}</dt>
          <dd className="mt-1 font-mono">{card.expiry}</dd>
        </div>
      </dl>

      <div className="border-t border-hairline pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        <Label>{t.cards.status}</Label>
        <p className="mt-1.5 text-sm">{card.isFrozen ? t.cards.frozenStatus : t.cards.active}</p>
        <Button
          variant="secondary"
          className="mt-4"
          aria-pressed={card.isFrozen}
          loading={freeze.isPending}
          onClick={() => void toggleFreeze()}
        >
          <Snowflake aria-hidden="true" className="size-4" />
          {card.isFrozen ? t.cards.unfreeze : t.cards.freeze}
        </Button>
        {freezeError && (
          <div className="mt-4">
            <ErrorMessage>{freezeError}</ErrorMessage>
          </div>
        )}
      </div>

      <div className="border-t border-hairline pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        <Label>{t.cards.limit}</Label>
        {editing ? (
          <LimitForm
            card={card}
            onDone={(cents) => {
              setEditing(false)
              if (cents !== undefined) onResult(t.cards.limitUpdated(formatMoney(cents)))
            }}
          />
        ) : (
          <Button variant="secondary" className="mt-4" onClick={() => setEditing(true)}>
            {t.cards.changeLimit}
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
  const { t } = useI18n()

  async function save() {
    const check = validateCardLimit(draft, card.spent)
    if (!check.ok) return setError(check.error)
    try {
      await update.mutateAsync({ cardId: card.id, limit: check.cents })
      onDone(check.cents)
    } catch (err) {
      setError(toFriendlyMessage(err, 'updateLimit'))
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
        label={t.cards.newLimit}
        hint={t.cards.limitHint(formatDollars(minimumLimit(card.spent)), formatDollars(LIMIT_MAX))}
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
          {t.cards.save}
        </Button>
        <Button variant="ghost" onClick={() => onDone()}>
          {t.app.cancel}
        </Button>
      </div>
    </form>
  )
}
