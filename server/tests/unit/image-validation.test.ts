import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  MAX_PHOTO_BYTES,
  inspectImage,
} from '../../src/features/ticket-evidence/image-validation.js'
import { createTestImage } from '../helpers/fake-image-storage.js'

describe('decoded evidence image validation', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'accepts and normalizes decoded %s images',
    async (format) => {
      const result = await inspectImage(
        await createTestImage(format, 3000, 1000),
      )

      expect(result.format).toBe(format)
      expect(result.width).toBeLessThanOrEqual(2048)
      expect(result.height).toBeLessThanOrEqual(2048)
      expect(result.bytes).not.toEqual(Buffer.alloc(0))
      expect((await sharp(result.bytes).metadata()).format).toBe(format)
    },
  )

  it('rejects a valid image encoded in an unsupported format', async () => {
    const gif = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: 'red',
      },
    })
      .gif()
      .toBuffer()

    await expect(inspectImage(gif)).rejects.toMatchObject({
      status: 400,
      code: 'EVIDENCE_INVALID_IMAGE',
    })
  })

  it('rejects malformed image bytes with the stable API error', async () => {
    await expect(
      inspectImage(Buffer.from('not an image')),
    ).rejects.toMatchObject({
      status: 400,
      code: 'EVIDENCE_INVALID_IMAGE',
    })
  })

  it('rejects an encoded payload above 8 MiB before decoding', async () => {
    await expect(
      inspectImage(Buffer.alloc(MAX_PHOTO_BYTES + 1)),
    ).rejects.toMatchObject({
      status: 413,
      code: 'EVIDENCE_LIMIT_EXCEEDED',
    })
  })
})
