import type { CardTier } from '@/types/bank'

/**
 * Card finishes, shared by the 3D card and its static CSS fallback so both look alike.
 * Polished but sober obsidian: near-black, a soft clearcoat sheen. The red accent never lives here: it is the 3D
 * scene's rim light (the screen's single red element).
 */
export const FINISH: Record<
  CardTier,
  { readonly base: string; readonly edge: string; readonly roughness: number; readonly css: string }
> = {
  black: {
    base: '#0b0b0d',
    edge: '#26262b',
    roughness: 0.3,
    css: 'linear-gradient(135deg, #1a1a1e 0%, #0b0b0d 55%, #050505 100%)',
  },
  platinum: {
    base: '#4a4c53',
    edge: '#8a8d96',
    roughness: 0.26,
    css: 'linear-gradient(135deg, #6b6e76 0%, #4a4c53 50%, #2d2f34 100%)',
  },
  corporate: {
    base: '#222427',
    edge: '#5a5e65',
    roughness: 0.34,
    css: 'linear-gradient(135deg, #34373c 0%, #222427 55%, #141517 100%)',
  },
}

/** ISO/IEC 7810 ID-1 proportions (85.60 × 53.98 mm). */
export const CARD_ASPECT = 85.6 / 53.98
