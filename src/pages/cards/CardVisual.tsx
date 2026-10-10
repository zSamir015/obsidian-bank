import { Component, lazy, Suspense, useState, type ComponentType, type MutableRefObject, type ReactNode } from 'react'
import type { CreditCard } from '@/types/bank'
import type { Card3DProps } from './Card3D'
import { prefersReducedMotion, supportsWebGL } from './capabilities'
import type { Face } from './motion'
import { StaticCard } from './StaticCard'

// three.js, React Three Fiber and Drei live only in this chunk.
const LazyCard3D = lazy(() => import('./Card3D'))

/**
 * The 3D card when it can run; otherwise, and while its chunk loads, the static CSS card.
 * Falls back for good on reduced motion, no WebGL, a failed chunk or a lost WebGL context.
 */
export function CardVisual({
  card,
  face = 'front',
  onFaceChange = () => {},
  scrollProgressRef,
  onInvalidateReady,
  Card3D = LazyCard3D,
}: {
  readonly card: CreditCard
  readonly face?: Face
  /** The 3D card reports the face it settled on after a drag. */
  readonly onFaceChange?: (face: Face) => void
  /** Optional native-scroll control for a story presentation. */
  readonly scrollProgressRef?: MutableRefObject<number>
  readonly onInvalidateReady?: (invalidate: (() => void) | null) => void
  /** Injectable for tests; defaults to the lazily loaded 3D chunk. */
  readonly Card3D?: ComponentType<Card3DProps>
}) {
  const [canRun3D] = useState(() => !prefersReducedMotion() && supportsWebGL())
  const [failed, setFailed] = useState(false)
  const fallback = <StaticCard card={card} face={face} />

  if (!canRun3D || failed) return fallback
  return (
    <FallbackOnError fallback={fallback} onError={() => setFailed(true)}>
      <Suspense fallback={fallback}>
        <Card3D
          card={card}
          face={face}
          onFaceChange={onFaceChange}
          scrollProgressRef={scrollProgressRef}
          onInvalidateReady={onInvalidateReady}
          onFailure={() => setFailed(true)}
        />
      </Suspense>
    </FallbackOnError>
  )
}

class FallbackOnError extends Component<
  { readonly fallback: ReactNode; readonly onError: () => void; readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch() {
    this.props.onError()
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
