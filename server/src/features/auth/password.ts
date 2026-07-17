import bcrypt from 'bcrypt'
import { randomBytes } from 'node:crypto'

const minimumPasswordBytes = 12
const maximumPasswordBytes = 72
const temporaryAlphabet =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function assertPasswordLength(password: string): void {
  const byteLength = Buffer.byteLength(password, 'utf8')
  if (byteLength < minimumPasswordBytes || byteLength > maximumPasswordBytes) {
    throw new Error('Password must be between 12 and 72 UTF-8 bytes.')
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordLength(password)
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function generateTemporaryPassword(
  getRandomBytes: typeof randomBytes = randomBytes,
): string {
  const maximumAcceptableByte = 256 - (256 % temporaryAlphabet.length)
  const characters: string[] = []

  while (characters.length < 16) {
    for (const byte of getRandomBytes(16)) {
      if (byte >= maximumAcceptableByte) continue
      characters.push(temporaryAlphabet[byte % temporaryAlphabet.length]!)
      if (characters.length === 16) break
    }
  }

  return characters.join('')
}
