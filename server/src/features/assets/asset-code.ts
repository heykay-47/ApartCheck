import { randomBytes } from 'node:crypto'
import type { AssetCategory } from './asset.model.js'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const prefixes: Record<AssetCategory, string> = {
  lift: 'LFT',
  plumbing: 'PLB',
  electrical: 'ELC',
}
const issuedCodes = new Set<string>()

export function generateAssetCode(category: AssetCategory): string {
  for (;;) {
    const bytes = randomBytes(6)
    let suffix = ''
    for (const byte of bytes) suffix += alphabet[byte % alphabet.length]
    const code = `${prefixes[category]}-${suffix}`
    if (!issuedCodes.has(code)) {
      issuedCodes.add(code)
      return code
    }
  }
}

export function generateQrToken(): string {
  return randomBytes(16).toString('base64url')
}
