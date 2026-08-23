import type {
  ImageStorage,
  StoredImage,
  UploadImageInput,
} from './image-storage.js'

export class InMemoryImageStorage implements ImageStorage {
  private readonly images = new Map<string, { bytes: Buffer }>()

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    this.images.set(input.publicId, {
      bytes: Buffer.from(input.bytes),
    })
    return {
      provider: 'development',
      assetId: input.publicId,
      publicId: input.publicId,
      format: input.format,
      byteSize: input.bytes.byteLength,
      width: input.width,
      height: input.height,
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    this.images.delete(publicId)
  }

  async readImage(publicId: string): Promise<Buffer> {
    const image = this.images.get(publicId)
    if (!image) throw new Error('Image is unavailable.')
    return Buffer.from(image.bytes)
  }
}
