import sharp from 'sharp'
import type {
  ImageStorage,
  StoredImage,
  UploadImageInput,
} from '../../src/storage/image-storage.js'

export class FakeImageStorage implements ImageStorage {
  uploads: UploadImageInput[] = []
  deletions: string[] = []
  reads: Array<{ publicId: string; bytes: Buffer }> = []
  failUpload = false
  failDelete = false
  failRead = false

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    if (this.failUpload) throw new Error('storage unavailable')
    this.uploads.push(input)
    const publicId = `test/${this.uploads.length}`
    this.images.set(publicId, Buffer.from(input.bytes))
    return {
      provider: 'cloudinary',
      assetId: `asset-${this.uploads.length}`,
      publicId,
      format: input.format,
      byteSize: input.bytes.byteLength,
      width: input.width,
      height: input.height,
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    if (this.failDelete) throw new Error('storage unavailable')
    this.deletions.push(publicId)
    this.images.delete(publicId)
  }

  async readImage(publicId: string): Promise<Buffer> {
    if (this.failRead) throw new Error('storage unavailable')
    const bytes = this.images.get(publicId)
    if (!bytes) throw new Error('storage unavailable')
    const copy = Buffer.from(bytes)
    this.reads.push({ publicId, bytes: copy })
    return copy
  }

  private readonly images = new Map<string, Buffer>()
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
