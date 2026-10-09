import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Label, SectionTitle } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tag } from '@/components/ui/Tag'
import { CARD_TIER_LABELS } from '@/lib/labels'
import { asCents } from '@/lib/money'
import type { CreditCard } from '@/types/bank'
import type { QueryView } from './query'

export function CardsSection({ cards }: { readonly cards: QueryView<readonly CreditCard[]> }) {
  return (
    <section aria-labelledby="cards">
      <SectionTitle
        id="cards"
        action={
          <ButtonLink to="/cards" variant="ghost" size="sm" className="-mr-4">
            Manage
          </ButtonLink>
        }
      >
        Cards
      </SectionTitle>
      {cards.isError ? (
        <ErrorMessage onRetry={() => void cards.refetch()}>Couldn't load your cards.</ErrorMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.isPending
            ? [0, 1].map((i) => <Skeleton key={i} className="h-44 rounded-card" />)
            : cards.data?.map((card) => <CardSummary key={card.id} card={card} />)}
        </div>
      )}
    </section>
  )
}

function CardSummary({ card }: { readonly card: CreditCard }) {
  const used = card.spent / card.limit
  // A frozen card cannot be used: its figures recede along with the Frozen tag.
  const tone = card.isFrozen ? 'text-muted' : ''
  return (
    <Card data-frozen={card.isFrozen}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>{CARD_TIER_LABELS[card.tier]}</Label>
          <p className="mt-1.5 text-sm">
            <span className="sr-only">Card ending in </span>
            <span aria-hidden="true">•••• </span>
            <span className="font-mono">{card.last4}</span>
          </p>
        </div>
        {card.isFrozen && <Tag>Frozen</Tag>}
      </div>
      <div className="mt-8 flex items-baseline justify-between gap-4 text-sm">
        <Money cents={card.spent} className={`text-xl font-medium ${tone}`} />
        <span className="text-muted">
          of <Money cents={card.limit} />
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${CARD_TIER_LABELS[card.tier]} card limit used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(used * 100)}
        className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={`h-full rounded-full ${card.isFrozen ? 'bg-muted/50' : 'bg-text'}`}
          style={{ width: `${Math.min(used, 1) * 100}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        <Money cents={asCents(card.limit - card.spent)} /> available · Expires {card.expiry}
      </p>
    </Card>
  )
}
