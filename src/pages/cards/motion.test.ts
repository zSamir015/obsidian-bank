import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ENTRY_MS,
  IDLE_START_MS,
  IDLE_STOP_MS,
  TURNTABLE_AMPLITUDE,
  clampTilt,
  entryAngle,
  faceAt,
  hasPlayedEntry,
  idlePhase,
  markEntryPlayed,
  settleTarget,
  turntableOffset,
} from './motion'

const PI = Math.PI
const deg = (d: number) => (d * PI) / 180

describe('settleTarget (where the card comes to rest after a drag)', () => {
  it.each([
    [deg(10), 0],
    [deg(80), 0],
    [deg(100), PI],
    [deg(260), PI],
    [deg(280), 2 * PI],
    [deg(-10), 0],
    [deg(-100), -PI],
    [deg(-170), -PI],
  ])('rests %f rad on the nearest face (%f) when released without speed', (angle, target) => {
    expect(settleTarget(angle, 0)).toBeCloseTo(target)
  })

  it.each([
    [5 * PI + 0.2, 5 * PI],
    [-7 * PI + 0.4, -7 * PI],
    [12 * PI - 0.3, 12 * PI],
    [-3 * PI - 1.7, -4 * PI],
  ])('keeps whole turns: %f rad settles on %f', (angle, target) => {
    expect(settleTarget(angle, 0)).toBeCloseTo(target)
  })

  it('carries a flick past the next face in its direction', () => {
    expect(settleTarget(deg(20), 4)).toBeCloseTo(PI)
    expect(settleTarget(deg(-20), -4)).toBeCloseTo(-PI)
  })

  it('caps very fast flicks at one extra turn', () => {
    expect(settleTarget(0, 500)).toBeCloseTo(2 * PI)
    expect(settleTarget(0, -500)).toBeCloseTo(-2 * PI)
    expect(settleTarget(3 * PI, 500)).toBeCloseTo(5 * PI)
  })

  it('always lands on a face (a multiple of π)', () => {
    for (let i = 0; i < 200; i++) {
      const angle = (Math.random() - 0.5) * 40
      const velocity = (Math.random() - 0.5) * 60
      const target = settleTarget(angle, velocity)
      expect(Math.abs(target / PI - Math.round(target / PI))).toBeLessThan(1e-9)
      expect(Math.abs(target - angle)).toBeLessThanOrEqual(2 * PI + PI / 2 + 1e-9)
    }
  })
})

describe('faceAt', () => {
  it.each([
    [0, 'front'],
    [deg(89), 'front'],
    [deg(91), 'back'],
    [PI, 'back'],
    [-PI, 'back'],
    [2 * PI, 'front'],
    [-5 * PI, 'back'],
  ] as const)('%f rad shows the %s', (angle, face) => {
    expect(faceAt(angle)).toBe(face)
  })
})

describe('entryAngle', () => {
  it('turns in from edge-on and settles facing front with an ease-out', () => {
    expect(entryAngle(0)).toBeCloseTo(PI / 2)
    expect(entryAngle(ENTRY_MS)).toBe(0)
    expect(entryAngle(ENTRY_MS * 2)).toBe(0)
    // Ease-out: most of the turn happens early, and it never overshoots past the front.
    expect(entryAngle(ENTRY_MS / 2)).toBeLessThan(PI / 4)
    for (let t = 0; t <= ENTRY_MS; t += 30) expect(entryAngle(t)).toBeGreaterThanOrEqual(0)
  })

  it('takes about 900 ms', () => {
    expect(ENTRY_MS).toBeGreaterThanOrEqual(800)
    expect(ENTRY_MS).toBeLessThanOrEqual(1000)
  })
})

describe('turntableOffset', () => {
  it('starts at rest and swings smoothly within ±15°', () => {
    expect(turntableOffset(0)).toBe(0)
    expect(TURNTABLE_AMPLITUDE).toBeCloseTo(deg(15))
    let max = 0
    for (let t = 0; t < 20_000; t += 50) max = Math.max(max, Math.abs(turntableOffset(t)))
    expect(max).toBeLessThanOrEqual(deg(15) + 1e-9)
    expect(max).toBeGreaterThan(deg(14))
  })

  it('moves slowly: never more than 0.5° per 50 ms', () => {
    for (let t = 0; t < 20_000; t += 50) {
      expect(Math.abs(turntableOffset(t + 50) - turntableOffset(t))).toBeLessThan(deg(0.5))
    }
  })
})

describe('idlePhase', () => {
  it('waits, then turns, then stops after about 30 s without interaction', () => {
    expect(idlePhase(0)).toBe('waiting')
    expect(idlePhase(IDLE_START_MS - 1)).toBe('waiting')
    expect(idlePhase(IDLE_START_MS)).toBe('turning')
    expect(idlePhase(IDLE_STOP_MS - 1)).toBe('turning')
    expect(idlePhase(IDLE_STOP_MS)).toBe('stopped')
    expect(IDLE_STOP_MS).toBeGreaterThanOrEqual(28_000)
    expect(IDLE_STOP_MS).toBeLessThanOrEqual(35_000)
  })
})

describe('clampTilt', () => {
  it('limits the X tilt to ±12°', () => {
    expect(clampTilt(deg(5))).toBeCloseTo(deg(5))
    expect(clampTilt(deg(40))).toBeCloseTo(deg(12))
    expect(clampTilt(deg(-40))).toBeCloseTo(deg(-12))
  })
})

describe('entry once per session', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('plays the entrance only the first time in a session', () => {
    expect(hasPlayedEntry()).toBe(false)
    markEntryPlayed()
    expect(hasPlayedEntry()).toBe(true)
  })

  it('treats unavailable storage as "already played" so it never animates in a loop', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => markEntryPlayed()).not.toThrow()
    expect(hasPlayedEntry()).toBe(true)
  })
})
