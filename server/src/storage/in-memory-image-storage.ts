import type {
  AcceptedImageFormat,
  ImageStorage,
  StoredImage,
  UploadImageInput,
} from './image-storage.js'

const VIEW_URL_SECONDS = 5 * 60

function mimeType(format: AcceptedImageFormat) {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`
}

export class InMemoryImageStorage implements ImageStorage {
  private readonly images = new Map<
    string,
    { bytes: Buffer; format: AcceptedImageFormat }
  >()

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    this.images.set(input.publicId, {
      bytes: Buffer.from(input.bytes),
      format: input.format,
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

  async createViewUrl(publicId: string) {
    const image = this.images.get(publicId)
    if (!image) throw new Error('Image is unavailable.')
    return {
      url: `data:${mimeType(image.format)};base64,${image.bytes.toString('base64')}`,
      expiresAt: new Date(
        (Math.floor(Date.now() / 1000) + VIEW_URL_SECONDS) * 1000,
      ),
    }
  }
}
