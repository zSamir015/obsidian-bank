import { useCallback, useEffect, useRef, useState, type ComponentType, type MutableRefObject } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { asCents } from '@/lib/money'
import type { CreditCard } from '@/types/bank'
import type { Face } from '@/pages/cards/motion'
import { StaticCard } from '@/pages/cards/StaticCard'

const STORY_CARD: CreditCard = {
  id: 'login-story-card',
  accountId: 'login-story-account',
  cardHolder: 'OBSIDIAN MEMBER',
  last4: '4821',
  expiry: '10/29',
  limit: asCents(0),
  spent: asCents(0),
  tier: 'black',
  isFrozen: false,
}

// Every language has the same number of story phrases as English.
const STEPS = 3

type CardVisualComponent = ComponentType<{
  readonly card: CreditCard
  readonly face: Face
  readonly scrollProgressRef: MutableRefObject<number>
  readonly onInvalidateReady: (invalidate: (() => void) | null) => void
}>
type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  cancelIdleCallback?: (handle: number) => void
}

export function LoginScrollStory() {
  const { t } = useI18n()
  const phrases = t.login.storyPhrases
  const storyRef = useRef<HTMLElement>(null)
  const scrollProgressRef = useRef(0)
  const invalidateRef = useRef<(() => void) | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [CardVisual, setCardVisual] = useState<CardVisualComponent | null>(null)
  const [step, setStep] = useState(0)
  const registerInvalidate = useCallback((invalidate: (() => void) | null) => {
    invalidateRef.current = invalidate
    invalidate?.()
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const desktop = window.matchMedia('(min-width: 1024px)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreferences = () => {
      setEnabled(desktop.matches)
      setReducedMotion(motion.matches)
    }
    updatePreferences()
    desktop.addEventListener('change', updatePreferences)
    motion.addEventListener('change', updatePreferences)
    return () => {
      desktop.removeEventListener('change', updatePreferences)
      motion.removeEventListener('change', updatePreferences)
    }
  }, [])

  useEffect(() => {
    if (!enabled || reducedMotion || CardVisual) return

    let cancelled = false
    const loadCard = () => {
      void import('@/pages/cards/CardVisual').then(({ CardVisual: LoadedCardVisual }) => {
        if (!cancelled) setCardVisual(() => LoadedCardVisual)
      })
    }

    const idleWindow = window as IdleWindow
    const idleId = idleWindow.requestIdleCallback?.(loadCard, { timeout: 2000 })
    const timeoutId = idleId === undefined ? window.setTimeout(loadCard, 1000) : undefined
    return () => {
      cancelled = true
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [enabled, reducedMotion, CardVisual])

  useEffect(() => {
    if (!enabled) return
    const story = storyRef.current
    if (!story) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const start = story.getBoundingClientRect().top + window.scrollY
        const distance = story.offsetHeight - window.innerHeight
        const progress = distance > 0 ? Math.max(0, Math.min(1, (window.scrollY - start) / distance)) : 0
        scrollProgressRef.current = progress
        const nextStep = Math.min(STEPS - 1, Math.floor(progress * STEPS))
        setStep((current) => (current === nextStep ? current : nextStep))
        if (!reducedMotion) invalidateRef.current?.()
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled, reducedMotion])

  if (!enabled) return null

  const face = reducedMotion && step > 0 ? 'back' : 'front'

  return (
    <section
      ref={storyRef}
      aria-label={t.login.storyLabel}
      data-testid="login-scroll-story"
      data-step={step}
      className="relative hidden h-[300dvh] lg:block"
    >
      <div className="sticky top-0 flex h-dvh flex-col justify-center py-12">
        <div className="mx-auto w-full max-w-xl">
          <div
            data-testid="login-story-card-frame"
            className="mx-auto aspect-[85.6/53.98] w-full max-w-[520px] origin-center"
            style={{ transform: reducedMotion ? 'none' : undefined }}
          >
            {CardVisual && !reducedMotion ? (
              <CardVisual
                card={STORY_CARD}
                face="front"
                scrollProgressRef={scrollProgressRef}
                onInvalidateReady={registerInvalidate}
              />
            ) : (
              <StaticCard card={STORY_CARD} face={face} />
            )}
          </div>
          <div className="mt-12 min-h-36">
            <p className="text-label text-muted uppercase">{t.login.storyEyebrow}</p>
            <div className="mt-3 grid">
              {phrases.map((phrase, index) => (
                <p
                  key={index}
                  aria-hidden={step !== index}
                  className={`col-start-1 row-start-1 text-3xl leading-tight font-medium tracking-[-0.01em] transition-opacity duration-300 motion-reduce:transition-none ${
                    step === index ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  {phrase}
                </p>
              ))}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-hairline">
              <div
                className="h-px bg-muted transition-[width] duration-300"
                style={{ width: `${((step + 1) / STEPS) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted">{`0${step + 1} / 0${STEPS}`}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
