import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector2,
  type Group,
} from 'three'
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
const RADIUS = WIDTH * (3.18 / 85.6) // ISO/IEC 7810 corner radius, scaled
const DEPTH = 0.03
const BEVEL = 0.006
const FACE_Z = DEPTH / 2 + BEVEL + 0.0008
const MAX_TILT = (9 * Math.PI) / 180 // 9° each way: enough to sweep the reflections, no visible perspective warp
const TOUCH_THRESHOLD = 8 // px of horizontal drag before a touch starts tilting
// Face texture: 2048px wide, over 2× the largest on-screen card (520 CSS px × dpr 2 = 1040px).
const FACE_LAYOUT_WIDTH = 1024
const FACE_SCALE = 2

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
        // Transparent: the page background shows around the card, no box.
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl, invalidate: requestFrame }) => {
          gl.setClearColor(0x000000, 0)
          invalidate.current = requestFrame
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onFailure()
          })
        }}
      >
        <Reflections />
        {/* No point-like key light: on the clearcoat it reads as a blown-out spot. The strips light the card. */}
        <ambientLight intensity={0.3} />
        {/* A trace of red on the left edge; the red flash itself is a reflection (see Reflections). */}
        <pointLight position={[-2.6, 1.4, 0.8]} color="#ff2a3b" intensity={card.isFrozen ? 1 : 2} distance={7} />
        <CardMesh card={card} target={target} />
      </Canvas>
    </div>
  )
}

/**
 * Studio reflections built in code (no HDR files). The environment stays still while the
 * card rotates, so reflections slide across the clearcoat when it tilts.
 *
 * A glossy face pointing at the camera mirrors what is behind the camera (z > 0), and a
 * 9° tilt swings that reflected direction by about ±18°. So everything meant to cross the
 * face sits behind the camera, within that cone:
 * - a large, very dim panel that keeps the body from reading as a hole;
 * - a soft diagonal strip, visible at rest, that sweeps across on tilt;
 * - a red strip about 31° to the side: just off the face at rest, it crosses the card as a
 *   diagonal flash when tilted. It is the screen's single red accent (with a trace of rim light).
 * The two side strips only catch the bevel, outlining the card's edge.
 */
function Reflections() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={0.15} position={[0, 0, 6]} scale={[24, 24, 1]} />
      <SoftStrip position={[-0.3, 0.4, 5]} angle={-0.55} length={16} width={0.9} intensity={2.4} />
      <SoftStrip position={[3, -0.2, 5]} angle={0.35} length={9} width={0.8} intensity={4} color="#ff2a3b" />
      <Lightformer form="rect" intensity={0.8} position={[-5, 0, 2.5]} scale={[0.4, 6, 1]} />
      <Lightformer form="rect" intensity={0.6} position={[5, 0, 2.5]} scale={[0.4, 6, 1]} />
    </Environment>
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

/**
 * Fine volcanic-glass grain: a tiny tangent-space normal map from seeded value noise,
 * generated in code (no image files). Mipmapped and anisotropic, so it fades instead of
 * shimmering when the card is small or tilted; it only reads up close.
 */
function useGrainNormalMap(anisotropy: number) {
  const texture = useMemo(() => {
    const size = 256
    let seed = 0x9e3779b9
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const noise = Float32Array.from({ length: size * size }, random)
    const height = (x: number, y: number) => noise[((y + size) % size) * size + ((x + size) % size)]!
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = height(x + 1, y) - height(x - 1, y)
        const dy = height(x, y + 1) - height(x, y - 1)
        const i = (y * size + x) * 4
        data[i] = Math.round((dx * 0.5 + 0.5) * 255)
        data[i + 1] = Math.round((dy * 0.5 + 0.5) * 255)
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }
    const map = new DataTexture(data, size, size)
    map.wrapS = map.wrapT = RepeatWrapping
    map.repeat.set(5, 3)
    map.generateMipmaps = true
    map.minFilter = LinearMipmapLinearFilter
    map.magFilter = LinearFilter
    map.anisotropy = anisotropy
    map.needsUpdate = true
    return map
  }, [anisotropy])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

const GRAIN_STRENGTH = new Vector2(0.035, 0.035)

function roundedRectShape(width: number, height: number, radius: number) {
  const x = -width / 2
  const y = -height / 2
  const shape = new Shape()
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

function CardMesh({ card, target }: { readonly card: CreditCard; readonly target: RefObject<Tilt> }) {
  const group = useRef<Group>(null)
  const face = useCardFace(card)
  const finish = FINISH[card.tier]
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const grain = useGrainNormalMap(maxAnisotropy)
  const shape = useMemo(() => roundedRectShape(WIDTH, HEIGHT, RADIUS), [])
  // Same rounded outline for the printed face, with UVs mapped 0..1 so the texture fits it.
  const faceGeometry = useMemo(() => {
    const geometry = new ShapeGeometry(shape, 24)
    const position = geometry.attributes.position!
    const uv = geometry.attributes.uv!
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (position.getX(i) + WIDTH / 2) / WIDTH, (position.getY(i) + HEIGHT / 2) / HEIGHT)
    }
    return geometry
  }, [shape])
  useEffect(() => () => faceGeometry.dispose(), [faceGeometry])

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
      <mesh position={[0, 0, -DEPTH / 2]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: DEPTH,
              bevelEnabled: true,
              bevelThickness: BEVEL,
              bevelSize: BEVEL,
              bevelSegments: 3,
              curveSegments: 24,
            },
          ]}
        />
        {/* High, smooth clearcoat: reflections read as light on polished glass. The grain sits
            under it, in the base layer, so it only shows up close. */}
        <meshPhysicalMaterial
          color={card.isFrozen ? finish.frozenBase : finish.base}
          roughness={card.isFrozen ? finish.roughness + 0.15 : finish.roughness}
          metalness={finish.metalness}
          normalMap={grain}
          normalScale={GRAIN_STRENGTH}
          clearcoat={1}
          clearcoatRoughness={card.isFrozen ? 0.16 : 0.1}
          envMapIntensity={card.isFrozen ? 0.7 : 1}
        />
      </mesh>
      {face && (
        <mesh geometry={faceGeometry} position={[0, 0, FACE_Z]}>
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
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
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
      created.anisotropy = maxAnisotropy
      setTexture(created)
      invalidate()
    })()
    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [tier, last4, cardHolder, expiry, isFrozen, invalidate, maxAnisotropy])

  return texture
}

function drawFace(card: Pick<CreditCard, 'tier' | 'last4' | 'cardHolder' | 'expiry' | 'isFrozen'>) {
  // Laid out on a 1024-wide grid and rendered at FACE_SCALE for sharp text.
  const width = FACE_LAYOUT_WIDTH
  const height = Math.round(width / CARD_ASPECT)
  const canvas = document.createElement('canvas')
  canvas.width = width * FACE_SCALE
  canvas.height = height * FACE_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(FACE_SCALE, FACE_SCALE)
  const pad = 64
  const ink = card.isFrozen ? 'rgba(255,255,255,0.55)' : '#ffffff'
  const muted = 'rgba(161,161,170,0.95)'

  // Obsidian mark: the shard from the logo, then the wordmark.
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
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
    // Frost hatch, like the static card: dark, thin lines veil the face without brightening
    // it, so a frozen card never reads lighter than an active one and reflections show through.
    ctx.save()
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    ctx.lineWidth = 6
    for (let x = -height; x < width; x += 28) {
      ctx.beginPath()
      ctx.moveTo(x, height)
      ctx.lineTo(x + height, 0)
      ctx.stroke()
    }
    ctx.restore()
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
