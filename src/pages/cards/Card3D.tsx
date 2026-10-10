import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import { damp } from 'maath/easing'
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'
import { Shape, ShapeGeometry, Vector2, type Group } from 'three'
import type { CreditCard } from '@/types/bank'
import { drawBack, drawFront, useArtTexture, useGrainNormalMap } from './cardArt'
import { CARD_ASPECT, FINISH } from './finish'
import {
  ENTRY_MS,
  IDLE_START_MS,
  clampTilt,
  entryAngle,
  faceAt,
  hasPlayedEntry,
  idlePhase,
  markEntryPlayed,
  settleTarget,
  turntableOffset,
  type Face,
} from './motion'
import { ContactShadow, Studio } from './Studio'
import { useRenderGate } from './useRenderGate'

export interface Card3DProps {
  readonly card: CreditCard
  readonly face: Face
  /** Reports the face the card settled on after a drag. */
  readonly onFaceChange: (face: Face) => void
  /** Optional native-scroll control used by the login story. */
  readonly scrollProgressRef?: MutableRefObject<number>
  readonly onInvalidateReady?: (invalidate: (() => void) | null) => void
  /** Called when the WebGL context is lost; the parent switches to the static card. */
  readonly onFailure: () => void
}

const WIDTH = 3.2
const HEIGHT = WIDTH / CARD_ASPECT
const RADIUS = WIDTH * (3.18 / 85.6) // ISO/IEC 7810 corner radius, scaled
const DEPTH = 0.06 // about twice a plastic card: a metal card that reads in 3D
const BEVEL = 0.01
const FACE_Z = DEPTH / 2 + BEVEL + 0.0008
const LIFT = 0.15 // the card hovers a little above the stage centre, over its shadow
const FOV = 26 // product-photo lens: little perspective distortion

// Spring feel (maath smooth damp: critically damped, no bounce).
const DRAG_SMOOTH = 0.07 // follows the pointer closely
const SETTLE_SMOOTH = 0.22 // ~0.8 s ease-out into the nearest face
const TURNTABLE_SMOOTH = 0.6 // trails the slow swing so it starts and ends softly
const FLOAT_AMPLITUDE = 0.04
const FLOAT_SPEED = 0.9 // radians of float phase per second

const GRAIN_STRENGTH = new Vector2(0.035, 0.035)

/** What the page can ask of the presented card. */
interface PresentationHandle {
  dragStart(): void
  dragMove(dxPixels: number, dyPixels: number, widthPixels: number): void
  /** `velocity` in pixels per millisecond, signed. */
  dragEnd(velocity: number, widthPixels: number): void
  showFace(face: Face): void
  /** Counts as an interaction: pauses the turntable and lets it resume after a short idle. */
  wake(): void
}

/**
 * The card as a product on a studio set. Drag to turn it (free around Y, limited tilt);
 * on release it settles on the nearest face. At rest it floats and slowly swings, then stops
 * after ~30 s. Motion is applied in useFrame: React never re-renders per frame, and with
 * frameloop="demand" frames are only drawn while something moves.
 */
export default function Card3D({
  card,
  face,
  onFaceChange,
  scrollProgressRef,
  onInvalidateReady,
  onFailure,
}: Card3DProps) {
  const container = useRef<HTMLDivElement>(null)
  const presentation = useRef<PresentationHandle>(null)
  const scene = useRef<Pick<RootState, 'setFrameloop'> | null>(null)
  const active = useRenderGate(container)
  const [playEntry] = useState(() => !scrollProgressRef && !hasPlayedEntry())
  const [shadowReady, setShadowReady] = useState(!playEntry)

  useEffect(() => {
    if (playEntry) markEntryPlayed()
  }, [playEntry])
  useEffect(() => () => onInvalidateReady?.(null), [onInvalidateReady])

  // The "Show back / Show front" button.
  useEffect(() => presentation.current?.showFace(face), [face])

  // Render only while on screen and in the foreground; coming back resumes the turntable.
  useEffect(() => {
    scene.current?.setFrameloop(active ? 'demand' : 'never')
    if (active) presentation.current?.wake()
  }, [active])

  const bind = useDrag(
    ({ first, last, movement: [mx, my], velocity: [vx], direction: [dx] }) => {
      const width = container.current?.clientWidth || 1
      if (first) presentation.current?.dragStart()
      presentation.current?.dragMove(mx, my, width)
      if (last) presentation.current?.dragEnd(vx * dx, width)
    },
    { filterTaps: true },
  )

  return (
    <div
      ref={container}
      {...bind()}
      data-card-visual="3d"
      data-frozen={card.isFrozen}
      data-face={face}
      aria-hidden="true"
      // Vertical swipes keep scrolling the page; horizontal drags turn the card.
      className="h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
    >
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl, invalidate, setFrameloop }) => {
          gl.setClearColor(0x000000, 0)
          scene.current = { setFrameloop }
          onInvalidateReady?.(invalidate)
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onFailure()
          })
          invalidate()
        }}
      >
        <ProductCamera />
        <Studio isFrozen={card.isFrozen} />
        <Presentation
          ref={presentation}
          initialFace={face}
          scrollProgressRef={scrollProgressRef}
          playEntry={playEntry}
          onEntryDone={() => setShadowReady(true)}
          onFaceSettled={onFaceChange}
        >
          <CardBody card={card} />
        </Presentation>
        {shadowReady && <ContactShadow y={LIFT - HEIGHT / 2 - 0.45} width={WIDTH} />}
      </Canvas>
    </div>
  )
}

/** A long lens framing the card like a product shot, filling a set share of the stage. */
function ProductCamera() {
  const size = useThree((state) => state.size)
  const share = size.width < 640 ? 0.88 : 0.55
  const visibleHeight = Math.max(WIDTH / share / (size.width / Math.max(size.height, 1)), HEIGHT / 0.7)
  const distance = visibleHeight / 2 / Math.tan((FOV * Math.PI) / 360)
  return <PerspectiveCamera makeDefault fov={FOV} position={[0, 0, distance]} />
}

interface Motion {
  targetY: number
  targetX: number
  dragging: boolean
  dragStart: { x: number; y: number }
  settledFace: Face
  lastInteraction: number
  turntableStart: number | null
  /** -1: entrance pending (starts on the first frame); null: no entrance. */
  entryStart: number | null
  floatPhase: number
}

function Presentation({
  ref,
  initialFace,
  scrollProgressRef,
  playEntry,
  onEntryDone,
  onFaceSettled,
  children,
}: {
  readonly ref: Ref<PresentationHandle>
  readonly initialFace: Face
  readonly scrollProgressRef?: MutableRefObject<number>
  readonly playEntry: boolean
  readonly onEntryDone: () => void
  readonly onFaceSettled: (face: Face) => void
  readonly children: ReactNode
}) {
  const turn = useRef<Group>(null)
  const float = useRef<Group>(null)
  const invalidate = useThree((state) => state.invalidate)
  const idleTimer = useRef(0)
  const motion = useRef<Motion>({
    targetY: initialFace === 'back' ? Math.PI : 0,
    targetX: 0,
    dragging: false,
    dragStart: { x: 0, y: 0 },
    settledFace: initialFace,
    lastInteraction: 0,
    turntableStart: null,
    entryStart: playEntry ? -1 : null,
    floatPhase: 0,
  })

  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  useImperativeHandle(ref, () => {
    const wake = () => {
      const m = motion.current
      m.lastInteraction = performance.now()
      m.turntableStart = null
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(invalidate, IDLE_START_MS + 20)
      invalidate()
    }
    return {
      wake,
      dragStart() {
        const m = motion.current
        const g = turn.current
        m.dragging = true
        m.entryStart = null
        m.dragStart = { x: g?.rotation.x ?? 0, y: g?.rotation.y ?? m.targetY }
        wake()
      },
      dragMove(dxPixels, dyPixels, widthPixels) {
        const m = motion.current
        const radiansPerPixel = Math.PI / widthPixels
        m.targetY = m.dragStart.y + dxPixels * radiansPerPixel
        m.targetX = clampTilt(m.dragStart.x + dyPixels * radiansPerPixel)
        wake()
      },
      dragEnd(velocity, widthPixels) {
        const m = motion.current
        m.dragging = false
        m.targetX = 0
        m.targetY = settleTarget(m.targetY, velocity * 1000 * (Math.PI / widthPixels))
        const settled = faceAt(m.targetY)
        if (settled !== m.settledFace) {
          m.settledFace = settled
          onFaceSettled(settled)
        }
        wake()
      },
      showFace(face) {
        const m = motion.current
        if (m.settledFace === face) return
        m.settledFace = face
        m.targetY += Math.PI // always turn forward
        m.entryStart = null
        wake()
      },
    }
  }, [invalidate, onFaceSettled])

  useFrame((state, delta) => {
    const m = motion.current
    const g = turn.current
    const f = float.current
    if (!g || !f) return
    if (scrollProgressRef) {
      g.rotation.set(0, Math.PI * scrollProgressRef.current, 0)
      f.position.y = LIFT
      return
    }
    const now = performance.now()
    let moving = false

    if (m.entryStart !== null) {
      // Entrance: from edge-on to facing front, on an exact ease-out curve.
      if (m.entryStart < 0) m.entryStart = now
      const elapsed = now - m.entryStart
      g.rotation.set(0, m.targetY + entryAngle(elapsed), 0)
      moving = true
      if (elapsed >= ENTRY_MS) {
        m.entryStart = null
        m.lastInteraction = now
        onEntryDone()
      }
    } else {
      const phase = m.dragging ? 'waiting' : idlePhase(now - m.lastInteraction)
      let offset = 0
      if (phase === 'turning') {
        m.turntableStart ??= now
        offset = turntableOffset(now - m.turntableStart)
        moving = true
      }
      const smooth = m.dragging ? DRAG_SMOOTH : phase === 'turning' ? TURNTABLE_SMOOTH : SETTLE_SMOOTH
      const turningY = damp(g.rotation, 'y', m.targetY + offset, smooth, delta)
      const turningX = damp(g.rotation, 'x', m.targetX, m.dragging ? DRAG_SMOOTH : SETTLE_SMOOTH, delta)
      moving ||= turningY || turningX || m.dragging
      // Float pauses while dragging and stops with the turntable; its phase only advances
      // while active, so it resumes where it left off instead of jumping.
      if (!m.dragging && phase !== 'stopped') {
        m.floatPhase += delta * FLOAT_SPEED
        moving = true
      }
    }
    f.position.y = LIFT + FLOAT_AMPLITUDE * Math.sin(m.floatPhase)
    if (moving) state.invalidate()
  })

  return (
    <group ref={float} position={[0, LIFT, 0]}>
      <group ref={turn} rotation={[0, initialFace === 'back' ? Math.PI : 0, 0]}>
        {children}
      </group>
    </group>
  )
}

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

function CardBody({ card }: { readonly card: CreditCard }) {
  const front = useArtTexture(drawFront, card)
  const back = useArtTexture(drawBack, card)
  const grain = useGrainNormalMap()
  const finish = FINISH[card.tier]
  const shape = useMemo(() => roundedRectShape(WIDTH, HEIGHT, RADIUS), [])
  // The printed faces share the body's rounded outline, with UVs mapped 0..1.
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

  return (
    <group>
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
        {/* Group 0: both faces. Polished volcanic glass: high, smooth clearcoat over the grain. */}
        <meshPhysicalMaterial
          attach="material-0"
          color={card.isFrozen ? finish.frozenBase : finish.base}
          roughness={card.isFrozen ? finish.roughness + 0.15 : finish.roughness}
          metalness={finish.metalness}
          normalMap={grain}
          normalScale={GRAIN_STRENGTH}
          clearcoat={1}
          clearcoatRoughness={card.isFrozen ? 0.16 : 0.1}
          envMapIntensity={card.isFrozen ? 0.7 : 1}
        />
        {/* Group 1: the edge, brushed metal in the tier's tone. */}
        <meshPhysicalMaterial
          attach="material-1"
          color={finish.edge}
          metalness={0.9}
          roughness={0.3}
          clearcoat={0.3}
          envMapIntensity={1.1}
        />
      </mesh>
      {front && (
        <mesh geometry={faceGeometry} position={[0, 0, FACE_Z]}>
          <meshBasicMaterial map={front} transparent toneMapped={false} />
        </mesh>
      )}
      {back && (
        <mesh geometry={faceGeometry} position={[0, 0, -FACE_Z]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial map={back} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
