import { describe, expect, it } from 'vitest'
import { InMemoryImageStorage } from '../../src/storage/in-memory-image-storage.js'

describe('in-memory development image storage', () => {
  it('stores local images and removes them without a provider call', async () => {
    const storage = new InMemoryImageStorage()
    const input = {
      bytes: Buffer.from('local-image'),
      format: 'png' as const,
      width: 32,
      height: 24,
      publicId: 'tickets/local/photo',
    }

    await expect(storage.uploadImage(input)).resolves.toMatchObject({
      provider: 'development',
      publicId: input.publicId,
      format: 'png',
    })
    await expect(storage.readImage(input.publicId)).resolves.toEqual(
      input.bytes,
    )

    await storage.deleteImage(input.publicId)
    await expect(storage.readImage(input.publicId)).rejects.toThrow(
      'Image is unavailable.',
    )
  })
})
