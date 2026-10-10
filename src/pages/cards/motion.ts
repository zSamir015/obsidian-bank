// Motion rules for the presented card, as pure functions so they can be tested without WebGL.
// Angles are radians around Y: 0 is the front, π the back; whole turns are kept so the card
// never spins back the long way.

const TAU = Math.PI * 2

/** How far a release keeps travelling: velocity (rad/s) × this many seconds of inertia. */
const FLICK_SECONDS = 0.35

/**
 * Where the card comes to rest after a drag: the face nearest to where its inertia would carry
 * it. Very fast flicks add at most one extra turn.
 */
export function settleTarget(angle: number, velocity: number): number {
  const carry = Math.max(-TAU, Math.min(TAU, velocity * FLICK_SECONDS))
  return Math.round((angle + carry) / Math.PI) * Math.PI
}

export type Face = 'front' | 'back'

export function faceAt(angle: number): Face {
  return Math.cos(angle) >= 0 ? 'front' : 'back'
}

/** The entrance: from edge-on to facing front, with a cubic ease-out and no overshoot. */
export const ENTRY_MS = 900

export function entryAngle(elapsedMs: number): number {
  if (elapsedMs >= ENTRY_MS) return 0
  const progress = Math.max(0, elapsedMs / ENTRY_MS)
  const eased = 1 - (1 - progress) ** 3
  return (Math.PI / 2) * (1 - eased)
}

/** Idle turntable: a slow ±15° swing around the face the card rests on. */
export const TURNTABLE_AMPLITUDE = (15 * Math.PI) / 180
const TURNTABLE_PERIOD_MS = 12_000

export function turntableOffset(elapsedMs: number): number {
  return TURNTABLE_AMPLITUDE * Math.sin((TAU * elapsedMs) / TURNTABLE_PERIOD_MS)
}

/** Idle timing: wait a moment after interaction, turn, then stop to save power. */
export const IDLE_START_MS = 4_000
export const IDLE_STOP_MS = 30_000

export type IdlePhase = 'waiting' | 'turning' | 'stopped'

export function idlePhase(msSinceInteraction: number): IdlePhase {
  if (msSinceInteraction < IDLE_START_MS) return 'waiting'
  if (msSinceInteraction < IDLE_STOP_MS) return 'turning'
  return 'stopped'
}

/** Up and down tilt while dragging is limited to ±12°; turning around Y is free. */
const MAX_TILT_X = (12 * Math.PI) / 180

export function clampTilt(angle: number): number {
  return Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, angle))
}

/** The entrance plays once per browser session. Without storage, it is treated as played. */
const ENTRY_KEY = 'obsidian-bank:card-entry-played'

export function hasPlayedEntry(): boolean {
  try {
    return sessionStorage.getItem(ENTRY_KEY) === '1'
  } catch {
    return true
  }
}

export function markEntryPlayed(): void {
  try {
    sessionStorage.setItem(ENTRY_KEY, '1')
  } catch {
    // Storage blocked (private mode, sandboxed frame): hasPlayedEntry already reports true.
  }
}
