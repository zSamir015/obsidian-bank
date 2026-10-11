import { describe, expect, it } from 'vitest'
import { isValidRoutingNumber, lastFourOfAccountNumber } from './aba'

describe('isValidRoutingNumber', () => {
  it.each(['021000021', '011000015', '122105278'])('accepts %s', (routing) => {
    expect(isValidRoutingNumber(routing)).toBe(true)
  })

  it.each([
    ['021000022', 'checksum fails'],
    ['130000006', 'checksum passes but 13 is not an assigned prefix'],
    ['000000000', 'all zeros'],
    ['02100002', 'too short'],
    ['0210000210', 'too long'],
    ['02100002a', 'not a digit'],
    [' 021000021', 'surrounding space'],
    ['', 'empty'],
  ])('rejects %s (%s)', (routing) => {
    expect(isValidRoutingNumber(routing)).toBe(false)
  })

  it('accepts every assigned prefix and rejects the gaps between them', () => {
    const withValidChecksum = (prefix: string) => {
      for (let check = 0; check <= 9; check++) {
        const candidate = `${prefix}000000${check}`
        const d = [...candidate].map(Number)
        if ((3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]! + d[7]!) + (d[2]! + d[5]! + d[8]!)) % 10 === 0) {
          return candidate
        }
      }
      throw new Error(`no checksum digit for ${prefix}`)
    }
    const assigned = (p: number) => p <= 12 || (p >= 21 && p <= 32) || (p >= 61 && p <= 72) || p === 80
    for (let prefix = 1; prefix <= 99; prefix++) {
      const routing = withValidChecksum(String(prefix).padStart(2, '0'))
      expect(isValidRoutingNumber(routing), routing).toBe(assigned(prefix))
    }
  })
})

describe('lastFourOfAccountNumber', () => {
  it.each([
    ['1234', '1234'],
    ['000123456789', '6789'],
    ['12345678901234567', '4567'],
    ['1234 5678', '5678'],
    ['1234-5678', '5678'],
  ])('%s → %s', (input, last4) => {
    expect(lastFourOfAccountNumber(input)).toBe(last4)
  })

  it.each(['123', '123456789012345678', '12a4', '', '    '])('rejects %j', (input) => {
    expect(lastFourOfAccountNumber(input)).toBeNull()
  })
})
