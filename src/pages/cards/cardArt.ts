// Card artwork for the 3D card: front and back drawn on canvases, plus the grain normal map.
// Everything is generated in code; there are no image files.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { CARD_TIER_LABELS } from '@/lib/labels'
import type { CreditCard } from '@/types/bank'
import { CARD_ASPECT, CARD_BACK } from './finish'

// Laid out on a 1024-wide grid and rendered at 2× (2048 px): over twice the largest
// on-screen card at dpr 2, so text stays sharp.
const LAYOUT_WIDTH = 1024
const LAYOUT_HEIGHT = Math.round(LAYOUT_WIDTH / CARD_ASPECT)
const SCALE = 2
const PAD = 64
const MUTED = 'rgba(161,161,170,0.95)'

type Art = Pick<CreditCard, 'tier' | 'last4' | 'cardHolder' | 'expiry' | 'isFrozen'>

function canvas2d() {
  const canvas = document.createElement('canvas')
  canvas.width = LAYOUT_WIDTH * SCALE
  canvas.height = LAYOUT_HEIGHT * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  return { canvas, ctx }
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string) {
  ctx.save()
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x + 18, y)
  ctx.lineTo(x + 36, y + 13)
  ctx.lineTo(x + 29, y + 44)
  ctx.lineTo(x + 7, y + 44)
  ctx.lineTo(x, y + 13)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.font = '500 34px Geist, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('Obsidian', x + 56, y + 23)
  ctx.restore()
}

/** Dark frost hatch and a FROZEN label: veils without brightening, reflections show through. */
function drawFrost(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 6
  for (let x = -LAYOUT_HEIGHT; x < LAYOUT_WIDTH; x += 28) {
    ctx.beginPath()
    ctx.moveTo(x, LAYOUT_HEIGHT)
    ctx.lineTo(x + LAYOUT_HEIGHT, 0)
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(5,5,5,0.55)'
  ctx.beginPath()
  ctx.roundRect(LAYOUT_WIDTH / 2 - 120, LAYOUT_HEIGHT / 2 - 36, 240, 72, 36)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 28px Geist, sans-serif'
  ctx.fillText('FROZEN', LAYOUT_WIDTH / 2, LAYOUT_HEIGHT / 2 + 2)
  ctx.restore()
}

export function drawFront(card: Art) {
  const { canvas, ctx } = canvas2d()
  const ink = card.isFrozen ? 'rgba(255,255,255,0.55)' : '#ffffff'
  drawMark(ctx, PAD, PAD, ink)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = MUTED
  ctx.font = '500 26px Geist, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(CARD_TIER_LABELS[card.tier].toUpperCase(), LAYOUT_WIDTH - PAD, PAD + 23)
  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.font = '400 54px "Geist Mono", monospace'
  ctx.fillText(`•••• ${card.last4}`, PAD, LAYOUT_HEIGHT - PAD - 92)
  ctx.fillStyle = MUTED
  ctx.font = '500 26px Geist, sans-serif'
  ctx.fillText(card.cardHolder.toUpperCase(), PAD, LAYOUT_HEIGHT - PAD - 10)
  ctx.textAlign = 'right'
  ctx.font = '400 26px "Geist Mono", monospace'
  ctx.fillText(card.expiry, LAYOUT_WIDTH - PAD, LAYOUT_HEIGHT - PAD - 10)
  if (card.isFrozen) drawFrost(ctx)
  return canvas
}

/** Magnetic stripe, signature panel with a decorative CVV, the mark and demo legal text. */
export function drawBack(card: Art) {
  const { canvas, ctx } = canvas2d()
  const stripeTop = Math.round(LAYOUT_HEIGHT * 0.09)
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, stripeTop, LAYOUT_WIDTH, Math.round(LAYOUT_HEIGHT * 0.18))

  const panelY = stripeTop + Math.round(LAYOUT_HEIGHT * 0.25)
  const panelH = Math.round(LAYOUT_HEIGHT * 0.13)
  const panelW = LAYOUT_WIDTH - PAD * 2 - 170
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(PAD, panelY, panelW, panelH, 6)
  ctx.clip()
  for (let i = 0; i * 12 < panelW + panelH; i++) {
    ctx.fillStyle = i % 2 ? '#c9c9cf' : '#d9d9de'
    ctx.fillRect(PAD + i * 12, panelY, 12, panelH)
  }
  ctx.restore()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(PAD + panelW + 16, panelY, 150, panelH, 6)
  ctx.fill()
  ctx.fillStyle = '#050505'
  ctx.font = '400 34px "Geist Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(CARD_BACK.cvv, PAD + panelW + 16 + 75, panelY + panelH / 2 + 2)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = MUTED
  ctx.font = '500 20px Geist, sans-serif'
  const words = CARD_BACK.legal.split(' ')
  const lines: string[] = []
  for (const word of words) {
    const line = lines.at(-1)
    if (line && ctx.measureText(`${line} ${word}`).width < 560) lines[lines.length - 1] = `${line} ${word}`
    else lines.push(word)
  }
  lines.forEach((line, i) => ctx.fillText(line, PAD, LAYOUT_HEIGHT - PAD - (lines.length - 1 - i) * 28))
  drawMark(ctx, LAYOUT_WIDTH - PAD - 200, LAYOUT_HEIGHT - PAD - 40, MUTED)
  if (card.isFrozen) drawFrost(ctx)
  return canvas
}

/** A canvas texture drawn after Geist has loaded, redrawn when the card details change. */
export function useArtTexture(draw: (card: Art) => HTMLCanvasElement, card: Art) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
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
      created = new CanvasTexture(draw({ tier, last4, cardHolder, expiry, isFrozen }))
      created.colorSpace = SRGBColorSpace
      created.anisotropy = anisotropy
      setTexture(created)
      invalidate()
    })()
    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [draw, tier, last4, cardHolder, expiry, isFrozen, invalidate, anisotropy])

  return texture
}

/**
 * Fine volcanic-glass grain: a tiny tangent-space normal map from seeded value noise.
 * Mipmapped and anisotropic, so it fades instead of shimmering; it only reads up close.
 */
export function useGrainNormalMap() {
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
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
