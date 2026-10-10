import { ContactShadows, Environment, Lightformer } from '@react-three/drei'

/**
 * Product-photo lighting built in code (no HDR files). The environment stays still while the
 * card turns, so reflections slide across it.
 *
 * - Two large side softboxes and a soft top light: even, studio-like modelling.
 * - A rim light behind the card that draws the metal edge as it turns.
 * - On the face: a soft diagonal strip visible at rest and a red strip ~31° aside that crosses
 *   the card when it turns. Red is the screen's only accent.
 * A glossy face pointing at the camera mirrors what is behind the camera (z > 0), so the
 * face strips live there.
 */
export function Studio({ isFrozen }: { readonly isFrozen: boolean }) {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={0.15} position={[0, 0, 6]} scale={[24, 24, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4.5, 0.6, 1.8]} scale={[2.6, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[4.5, 0.6, 1.8]} scale={[2.6, 5, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, 4.5, 1.5]} scale={[7, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 0.8, -5]} scale={[10, 0.6, 1]} />
        <SoftStrip position={[-0.3, 0.4, 5]} angle={-0.55} length={16} width={0.9} intensity={2.4} />
        <SoftStrip position={[3, -0.2, 5]} angle={0.35} length={9} width={0.8} intensity={4} color="#ff2a3b" />
      </Environment>
      <ambientLight intensity={0.3} />
      {/* Rim light from behind and above: catches the edge when the card turns. */}
      <directionalLight position={[0, 2.5, -4]} intensity={1.4} />
      {/* A trace of red on the left edge; the red flash itself is a reflection (above). */}
      <pointLight position={[-2.6, 1.4, 0.8]} color="#ff2a3b" intensity={isFrozen ? 1 : 2} distance={7} />
    </>
  )
}

/** Soft contact shadow, baked once: mount it when the card is facing front and at rest. */
export function ContactShadow({ y, width }: { readonly y: number; readonly width: number }) {
  return (
    <ContactShadows
      position={[0, y, 0]}
      scale={width * 2.2}
      opacity={0.5}
      blur={2.6}
      far={1.6}
      resolution={512}
      frames={1}
      color="#000000"
    />
  )
}

/**
 * A strip with a soft falloff: three overlapping Lightformers, narrow and bright to wide and
 * dim, so the reflection on the glossy clearcoat has no hard edges. Passing `rotation`
 * keeps Lightformer from pointing itself at the origin (it would discard the angle).
 */
function SoftStrip({
  position,
  angle,
  length,
  width,
  intensity,
  color = '#ffffff',
}: {
  readonly position: [number, number, number]
  readonly angle: number
  readonly length: number
  readonly width: number
  readonly intensity: number
  readonly color?: string
}) {
  return (
    <>
      {[
        [0.35, 0.5],
        [0.7, 0.3],
        [1.4, 0.2],
      ].map(([w, share]) => (
        <Lightformer
          key={w}
          form="rect"
          color={color}
          intensity={intensity * share!}
          position={position}
          rotation={[0, 0, angle]}
          scale={[w! * width, length, 1]}
        />
      ))}
    </>
  )
}
