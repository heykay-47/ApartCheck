import sharp from 'sharp'
import type {
  ImageStorage,
  StoredImage,
  UploadImageInput,
} from '../../src/storage/image-storage.js'

export class FakeImageStorage implements ImageStorage {
  uploads: UploadImageInput[] = []
  deletions: string[] = []
  failUpload = false
  failDelete = false
  failView = false

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    if (this.failUpload) throw new Error('storage unavailable')
    this.uploads.push(input)
    return {
      provider: 'cloudinary',
      assetId: `asset-${this.uploads.length}`,
      publicId: `test/${this.uploads.length}`,
      format: input.format,
      byteSize: input.bytes.byteLength,
      width: input.width,
      height: input.height,
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (this.failDelete) throw new Error('storage unavailable')
    this.deletions.push(publicId)
  }

  async createViewUrl(publicId: string) {
    if (this.failView) throw new Error('storage unavailable')
    return {
      url: `https://images.example.test/${publicId}`,
      expiresAt: new Date('2026-08-18T00:05:00.000Z'),
    }
  }
}

export async function createTestImage(
  format: 'jpeg' | 'png' | 'webp',
  width = 32,
  height = 24,
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 32, g: 96, b: 128 },
    },
  })
    .toFormat(format)
    .toBuffer()
}
