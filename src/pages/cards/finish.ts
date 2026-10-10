import type { CardTier } from '@/types/bank'

interface Finish {
  /** Body color of the 3D card. Never darker than the page background (#050505). */
  readonly base: string
  /** Frozen body: slightly dimmer and greyer than base, still above the page background. */
  readonly frozenBase: string
  readonly edge: string
  readonly roughness: number
  readonly metalness: number
  /** Static fallback, built from the same colors. */
  readonly css: string
  readonly frozenCss: string
}

/**
 * Card finishes, shared by the 3D card and its static CSS fallback so both look alike.
 * Polished volcanic glass: a high, smooth clearcoat over a near-black body. The red accent
 * never lives here: it comes from the 3D scene's lighting (the screen's single red element).
 */
export const FINISH: Record<CardTier, Finish> = {
  black: {
    base: '#0e0e10',
    frozenBase: '#0e0e10',
    edge: '#2a2a30',
    roughness: 0.35,
    metalness: 0.05,
    css: 'linear-gradient(135deg, #202024 0%, #0e0e10 55%, #0b0b0d 100%)',
    frozenCss: 'linear-gradient(135deg, #1d1d21 0%, #121215 55%, #0e0e10 100%)',
  },
  platinum: {
    base: '#7d8089',
    frozenBase: '#5e6168',
    edge: '#a4a7b0',
    roughness: 0.32,
    metalness: 0.4,
    css: 'linear-gradient(135deg, #a2a5ae 0%, #7d8089 50%, #5b5e66 100%)',
    frozenCss: 'linear-gradient(135deg, #7a7d84 0%, #5e6168 50%, #474a50 100%)',
  },
  corporate: {
    base: '#34363b',
    frozenBase: '#2c2e32',
    edge: '#5c5f66',
    roughness: 0.35,
    metalness: 0.2,
    css: 'linear-gradient(135deg, #4a4d53 0%, #34363b 55%, #24262a 100%)',
    frozenCss: 'linear-gradient(135deg, #3f4146 0%, #2c2e32 55%, #1f2024 100%)',
  },
}

/** ISO/IEC 7810 ID-1 proportions (85.60 × 53.98 mm). */
export const CARD_ASPECT = 85.6 / 53.98
