import { CARD_TIER_LABELS } from '@/lib/labels'
import type { CreditCard } from '@/types/bank'
import { CARD_BACK, FINISH } from './finish'
import type { Face } from './motion'

function Mark({ className = '' }: { readonly className?: string }) {
  return (
    <span className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2.5 19.5 8 16.8 21H7.2L4.5 8Z" />
      </svg>
      Obsidian
    </span>
  )
}

/**
 * CSS card with the same information as the 3D one, front and back. Used with reduced motion,
 * without WebGL, while the 3D chunk loads and if it fails; turning it over is instant.
 * Decorative: the details are also listed as text next to it.
 */
export function StaticCard({ card, face = 'front' }: { readonly card: CreditCard; readonly face?: Face }) {
  const finish = FINISH[card.tier]
  return (
    <div
      data-card-visual="static"
      data-frozen={card.isFrozen}
      data-face={face}
      aria-hidden="true"
      className="relative isolate aspect-[85.6/53.98] w-full max-w-[520px] overflow-hidden rounded-[22px] border text-text"
      style={{ background: card.isFrozen ? finish.frozenCss : finish.css, borderColor: finish.edge }}
    >
      {face === 'front' ? (
        <div className={`flex h-full flex-col justify-between p-[6%] ${card.isFrozen ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex items-start justify-between">
            <Mark />
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
      ) : (
        <div className={`flex h-full flex-col ${card.isFrozen ? 'opacity-60 grayscale' : ''}`}>
          <div className="mt-[8%] h-[18%] bg-[#050505]" />
          <div className="mx-[6%] mt-[6%] flex h-[14%] items-center justify-end rounded-sm bg-[repeating-linear-gradient(170deg,#d9d9de_0_6px,#c9c9cf_6px_12px)] pr-3">
            <span className="rounded-sm bg-white px-2 font-mono text-sm text-[#050505]">{CARD_BACK.cvv}</span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-6 p-[6%]">
            <p className="max-w-[70%] text-[10px] leading-snug text-muted">{CARD_BACK.legal}</p>
            <Mark className="text-muted" />
          </div>
        </div>
      )}
      {card.isFrozen && (
        <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(0_0_0/0.22)_10px_13px)]">
          <span className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-hairline bg-bg/70 px-3 py-1 text-label font-medium text-text uppercase">
            Frozen
          </span>
        </div>
      )}
    </div>
  )
}
