import { describe, expect, it } from 'vitest'
import { base64UrlToBytes } from './push'

describe('base64UrlToBytes', () => {
  it('decodes an unpadded base64url VAPID key', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff])
    expect(base64UrlToBytes(`B${'A'.repeat(86)}`)).toHaveLength(65)
  })
})
