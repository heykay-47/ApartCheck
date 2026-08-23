import { v2 as cloudinary } from 'cloudinary'
import type {
  ImageStorage,
  StoredImage,
  UploadImageInput,
} from './image-storage.js'

type CloudinaryUploadResult = {
  asset_id?: string
  public_id?: string
}

type CloudinaryClient = {
  config(options: Record<string, unknown>): unknown
  uploader: {
    upload_stream(
      options: Record<string, unknown>,
      callback: (error: Error | null, result?: CloudinaryUploadResult) => void,
    ): { end(bytes: Buffer): void }
    destroy(
      publicId: string,
      options: Record<string, unknown>,
    ): Promise<unknown>
  }
  url(publicId: string, options: Record<string, unknown>): string
}

export type CloudinaryImageStorageConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type FetchImage = (url: string) => Promise<Response>

export class CloudinaryImageStorage implements ImageStorage {
  private readonly client: CloudinaryClient
  private readonly config: CloudinaryImageStorageConfig
  private readonly fetchImage: FetchImage

  constructor(
    config: CloudinaryImageStorageConfig,
    client: CloudinaryClient = cloudinary as unknown as CloudinaryClient,
    fetchImage: FetchImage = (url) => fetch(url),
  ) {
    this.config = config
    this.client = client
    this.fetchImage = fetchImage
    this.client.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    })
  }

  async uploadImage(input: UploadImageInput): Promise<StoredImage> {
    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const stream = this.client.uploader.upload_stream(
          {
            resource_type: 'image',
            type: 'authenticated',
            public_id: input.publicId,
          },
          (error, uploadResult) => {
            if (error) {
              reject(error)
              return
            }
            if (!uploadResult) {
              reject(new Error('Cloudinary returned no upload result.'))
              return
            }
            resolve(uploadResult)
          },
        )
        stream.end(input.bytes)
      },
    )

    return {
      provider: 'cloudinary',
      assetId: result.asset_id ?? result.public_id ?? input.publicId,
      publicId: result.public_id ?? input.publicId,
      format: input.format,
      byteSize: input.bytes.byteLength,
      width: input.width,
      height: input.height,
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.client.uploader.destroy(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      invalidate: true,
    })
  }

  async readImage(publicId: string): Promise<Buffer> {
    const url = this.client.url(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      secure: true,
      sign_url: true,
    })
    const response = await this.fetchImage(url)
    if (!response.ok) throw new Error('Cloudinary image is unavailable.')
    return Buffer.from(await response.arrayBuffer())
  }
}
