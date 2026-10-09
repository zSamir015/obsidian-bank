import { RoundedBox } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { CanvasTexture, SRGBColorSpace, type Group } from 'three'
import { CARD_TIER_LABELS } from '@/lib/labels'
import type { CreditCard } from '@/types/bank'
import { CARD_ASPECT, FINISH } from './finish'

export interface Card3DProps {
  readonly card: CreditCard
  /** Called when the WebGL context is lost; the parent switches to the static card. */
  readonly onFailure: () => void
}

interface Tilt {
  x: number
  y: number
}

const WIDTH = 3.2
const HEIGHT = WIDTH / CARD_ASPECT
const DEPTH = 0.05
const MAX_TILT = 0.32 // radians
const TOUCH_THRESHOLD = 8 // px of horizontal drag before a touch starts tilting

/**
 * Procedural 3D card. Tilts toward the pointer with inertia and settles back when it
 * leaves. Pointer input is kept in refs and applied in useFrame: React never re-renders
 * while the card moves, and with frameloop="demand" frames are drawn only until it settles.
 */
export default function Card3D({ card, onFailure }: Card3DProps) {
  const target = useRef<Tilt>({ x: 0, y: 0 })
  const invalidate = useRef<() => void>(() => {})
  const touch = useRef<{ x: number; y: number; tilting: boolean } | null>(null)

  function aim(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
    target.current = { x: ny * MAX_TILT, y: nx * MAX_TILT }
    invalidate.current()
  }

  function settle() {
    touch.current = null
    target.current = { x: 0, y: 0 }
    invalidate.current()
  }

  return (
    <div
      data-card-visual="3d"
      data-frozen={card.isFrozen}
      aria-hidden="true"
      // Vertical swipes keep scrolling the page; only a horizontal drag tilts the card.
      className="aspect-[85.6/53.98] w-full max-w-[520px] touch-pan-y"
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') touch.current = { x: e.clientX, y: e.clientY, tilting: false }
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'touch') return aim(e)
        const start = touch.current
        if (!start) return
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        if (!start.tilting && Math.abs(dx) > TOUCH_THRESHOLD && Math.abs(dx) > Math.abs(dy)) start.tilting = true
        if (start.tilting) aim(e)
      }}
      onPointerLeave={settle}
      onPointerUp={(e) => e.pointerType === 'touch' && settle()}
      onPointerCancel={settle}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 0, 3.9], fov: 35 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl, invalidate: requestFrame }) => {
          invalidate.current = requestFrame
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onFailure()
          })
        }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[2.5, 3, 5]} intensity={1.6} />
        {/* The screen's single red element: a rim light grazing the card's edge. */}
        <pointLight position={[-2.6, 1.4, 0.8]} color="#ff2a3b" intensity={card.isFrozen ? 3 : 8} distance={7} />
        <CardMesh card={card} target={target} />
      </Canvas>
    </div>
  )
}

function CardMesh({ card, target }: { readonly card: CreditCard; readonly target: RefObject<Tilt> }) {
  const group = useRef<Group>(null)
  const face = useCardFace(card)
  const finish = FINISH[card.tier]

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const ease = 1 - Math.exp(-delta * 6) // frame-rate independent inertia
    g.rotation.x += (target.current.x - g.rotation.x) * ease
    g.rotation.y += (target.current.y - g.rotation.y) * ease
    const moving = Math.abs(target.current.x - g.rotation.x) > 1e-4 || Math.abs(target.current.y - g.rotation.y) > 1e-4
    if (moving) state.invalidate()
  })

  return (
    <group ref={group}>
      <RoundedBox args={[WIDTH, HEIGHT, DEPTH]} radius={0.14} smoothness={4}>
        <meshPhysicalMaterial
          color={finish.base}
          roughness={finish.roughness}
          metalness={0.15}
          clearcoat={0.35}
          clearcoatRoughness={0.5}
        />
      </RoundedBox>
      {card.isFrozen && (
        // Frost veil over the face, matching the static card.
        <mesh position={[0, 0, DEPTH / 2 + 0.0005]}>
          <planeGeometry args={[WIDTH - 0.02, HEIGHT - 0.02]} />
          <meshBasicMaterial color="#a1a1aa" transparent opacity={0.14} toneMapped={false} />
        </mesh>
      )}
      {face && (
        <mesh position={[0, 0, DEPTH / 2 + 0.001]}>
          <planeGeometry args={[WIDTH, HEIGHT]} />
          <meshBasicMaterial map={face} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/** Card face text drawn once per card change, after Geist has loaded. */
function useCardFace(card: CreditCard) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  const { tier, last4, cardHolder, expiry, isFrozen } = card

  useEffect(() => {
    let cancelled = false
    let created: CanvasTexture | null = null
    void (async () => {
      await document.fonts.ready
      await Promise.all([document.fonts.load('500 64px Geist'), document.fonts.load('400 64px "Geist Mono"')]).catch(
        () => {},
      )
      if (cancelled) return
      created = new CanvasTexture(drawFace({ tier, last4, cardHolder, expiry, isFrozen }))
      created.colorSpace = SRGBColorSpace
      created.anisotropy = 4
      setTexture(created)
      invalidate()
    })()
    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [tier, last4, cardHolder, expiry, isFrozen, invalidate])

  return texture
}

function drawFace(card: Pick<CreditCard, 'tier' | 'last4' | 'cardHolder' | 'expiry' | 'isFrozen'>) {
  const width = 1024
  const height = Math.round(width / CARD_ASPECT)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pad = 64
  const ink = card.isFrozen ? 'rgba(255,255,255,0.55)' : '#ffffff'
  const muted = 'rgba(161,161,170,0.95)'

  // Obsidian mark: the shard from the logo, then the wordmark.
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(pad + 18, pad)
  ctx.lineTo(pad + 36, pad + 13)
  ctx.lineTo(pad + 29, pad + 44)
  ctx.lineTo(pad + 7, pad + 44)
  ctx.lineTo(pad, pad + 13)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.font = '500 34px Geist, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Obsidian', pad + 56, pad + 23)

  ctx.fillStyle = muted
  ctx.font = '500 26px Geist, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(CARD_TIER_LABELS[card.tier].toUpperCase(), width - pad, pad + 23)

  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '400 54px "Geist Mono", monospace'
  ctx.fillText(`•••• ${card.last4}`, pad, height - pad - 92)

  ctx.fillStyle = muted
  ctx.font = '500 26px Geist, sans-serif'
  ctx.fillText(card.cardHolder.toUpperCase(), pad, height - pad - 10)
  ctx.textAlign = 'right'
  ctx.font = '400 26px "Geist Mono", monospace'
  ctx.fillText(card.expiry, width - pad, height - pad - 10)

  if (card.isFrozen) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(5,5,5,0.55)'
    ctx.beginPath()
    ctx.roundRect(width / 2 - 120, height / 2 - 36, 240, 72, 36)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '500 28px Geist, sans-serif'
    ctx.fillText('FROZEN', width / 2, height / 2 + 2)
  }
  return canvas
}
