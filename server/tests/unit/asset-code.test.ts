import { describe, expect, it } from 'vitest'
import {
  generateAssetCode,
  generateQrToken,
} from '../../src/features/assets/asset-code.js'

describe('asset identifiers', () => {
  it('generates category-prefixed asset codes', () => {
    expect(generateAssetCode('lift')).toMatch(/^LFT-[A-Z2-9]{6}$/)
    expect(generateAssetCode('plumbing')).toMatch(/^PLB-[A-Z2-9]{6}$/)
    expect(generateAssetCode('electrical')).toMatch(/^ELC-[A-Z2-9]{6}$/)
  })

  it('generates unique asset codes and 128-bit QR tokens', () => {
    const codes = new Set(
      Array.from({ length: 10000 }, () => generateAssetCode('lift')),
    )
    const tokens = new Set(
      Array.from({ length: 10000 }, () => generateQrToken()),
    )

    expect(codes).toHaveLength(10000)
    expect(tokens).toHaveLength(10000)
    expect(
      Buffer.from(generateQrToken(), 'base64url').byteLength,
    ).toBeGreaterThanOrEqual(16)
  })
})
