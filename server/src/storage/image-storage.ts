export type AcceptedImageFormat = 'jpeg' | 'png' | 'webp'

export type UploadImageInput = {
  bytes: Buffer
  format: AcceptedImageFormat
  width: number
  height: number
  publicId: string
}

export type StoredImage = {
  provider: 'cloudinary'
  assetId: string
  publicId: string
  format: AcceptedImageFormat
  byteSize: number
  width: number
  height: number
}

export interface ImageStorage {
  uploadImage(input: UploadImageInput): Promise<StoredImage>
  deleteImage(publicId: string): Promise<void>
  createViewUrl(publicId: string): Promise<{ url: string; expiresAt: Date }>
}
