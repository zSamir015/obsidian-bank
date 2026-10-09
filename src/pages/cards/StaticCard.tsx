import { CARD_TIER_LABELS } from '@/lib/labels'
import type { CreditCard } from '@/types/bank'
import { FINISH } from './finish'

/**
 * CSS card with the same information as the 3D one. Used with reduced motion, without
 * WebGL, while the 3D chunk loads and if it fails. Decorative: the details are also listed
 * as text next to it.
 */
export function StaticCard({ card }: { readonly card: CreditCard }) {
  const finish = FINISH[card.tier]
  return (
    <div
      data-card-visual="static"
      data-frozen={card.isFrozen}
      aria-hidden="true"
      className="relative isolate aspect-[85.6/53.98] w-full max-w-[520px] overflow-hidden rounded-[22px] border p-[6%] text-text"
      style={{ background: finish.css, borderColor: finish.edge }}
    >
      <div className={`flex h-full flex-col justify-between ${card.isFrozen ? 'opacity-60 grayscale' : ''}`}>
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2.5 19.5 8 16.8 21H7.2L4.5 8Z" />
            </svg>
            Obsidian
          </span>
          <span className="text-label font-medium text-muted uppercase">{CARD_TIER_LABELS[card.tier]}</span>
        </div>
        <div>
          <p className="text-xl tracking-[0.12em]">
            •••• <span className="font-mono">{card.last4}</span>
          </p>
          <div className="mt-3 flex items-end justify-between text-xs text-muted">
            <span className="uppercase">{card.cardHolder}</span>
            <span className="font-mono">{card.expiry}</span>
          </div>
        </div>
      </div>
      {card.isFrozen && (
        <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(255_255_255/0.04)_10px_20px)]">
          <span className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-hairline bg-bg/70 px-3 py-1 text-label font-medium text-text uppercase">
            Frozen
          </span>
        </div>
      )}
    </div>
  )
}
