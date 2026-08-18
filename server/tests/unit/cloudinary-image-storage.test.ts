import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { CloudinaryImageStorage } from '../../src/storage/cloudinary-image-storage.js'
import type { UploadImageInput } from '../../src/storage/image-storage.js'

function input(): UploadImageInput {
  return {
    bytes: Buffer.from('normalized-image'),
    format: 'png',
    width: 640,
    height: 480,
    publicId: 'tickets/society/ticket/photo',
  }
}

describe('Cloudinary image storage', () => {
  it('uploads normalized bytes as an authenticated image with the server public id', async () => {
    const stream = new PassThrough()
    const uploadStream = vi
      .fn()
      .mockImplementation(
        (
          options: Record<string, unknown>,
          callback: (
            error: Error | null,
            result?: Record<string, unknown>,
          ) => void,
        ) => {
          expect(options).toMatchObject({
            resource_type: 'image',
            type: 'authenticated',
            public_id: input().publicId,
          })
          queueMicrotask(() =>
            callback(null, {
              asset_id: 'cloudinary-asset-id',
              public_id: input().publicId,
            }),
          )
          return stream
        },
      )
    const client = {
      config: vi.fn(),
      uploader: {
        upload_stream: uploadStream,
        destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
      },
      utils: {
        private_download_url: vi
          .fn()
          .mockReturnValue('https://signed.example.test/photo'),
      },
    }
    const storage = new CloudinaryImageStorage(
      { cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' },
      client as never,
    )

    const result = await storage.uploadImage(input())

    expect(client.config).toHaveBeenCalledWith({
      cloud_name: 'cloud',
      api_key: 'key',
      api_secret: 'secret',
      secure: true,
    })
    expect(uploadStream).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      provider: 'cloudinary',
      assetId: 'cloudinary-asset-id',
      publicId: input().publicId,
      format: 'png',
      byteSize: input().bytes.byteLength,
      width: input().width,
      height: input().height,
    })
  })

  it('deletes by public id with authenticated image invalidation', async () => {
    const client = {
      config: vi.fn(),
      uploader: {
        upload_stream: vi.fn(),
        destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
      },
      utils: { private_download_url: vi.fn() },
    }
    const storage = new CloudinaryImageStorage(
      { cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' },
      client as never,
    )

    await storage.deleteImage('tickets/society/ticket/photo')

    expect(client.uploader.destroy).toHaveBeenCalledWith(
      'tickets/society/ticket/photo',
      { resource_type: 'image', type: 'authenticated', invalidate: true },
    )
  })

  it('creates a five-minute authenticated view URL', async () => {
    const client = {
      config: vi.fn(),
      uploader: { upload_stream: vi.fn(), destroy: vi.fn() },
      url: vi.fn().mockReturnValue('https://signed.example.test/photo'),
      utils: {
        generate_auth_token: vi.fn().mockReturnValue('__cld_token__=token'),
      },
    }
    const storage = new CloudinaryImageStorage(
      { cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' },
      client as never,
    )
    const before = Date.now()

    const result = await storage.createViewUrl('tickets/society/ticket/photo')

    expect(client.url).toHaveBeenCalledWith(
      'tickets/society/ticket/photo',
      expect.objectContaining({
        resource_type: 'image',
        type: 'authenticated',
        secure: true,
        sign_url: true,
      }),
    )
    expect(client.utils.generate_auth_token).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'secret',
        duration: 300,
        acl: expect.any(String),
      }),
    )
    const expiresAt = Math.floor(result.expiresAt.getTime() / 1000)
    expect(expiresAt).toBeGreaterThanOrEqual(Math.floor(before / 1000) + 299)
    expect(expiresAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 300)
    expect(result.url).toBe(
      'https://signed.example.test/photo?__cld_token__=token',
    )
    expect(result.expiresAt.getTime()).toBe(expiresAt * 1000)
  })
})
