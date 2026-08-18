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
        private_download_url: vi.fn(),
      },
    }
    const storage = new CloudinaryImageStorage(
      {
        cloudName: 'cloud',
        apiKey: 'key',
        apiSecret: 'api-secret',
        authTokenKey: '0123456789abcdef0123456789abcdef',
      },
      client as never,
    )

    const result = await storage.uploadImage(input())

    expect(client.config).toHaveBeenCalledWith({
      cloud_name: 'cloud',
      api_key: 'key',
      api_secret: 'api-secret',
      auth_token: { key: '0123456789abcdef0123456789abcdef' },
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
      {
        cloudName: 'cloud',
        apiKey: 'key',
        apiSecret: 'api-secret',
        authTokenKey: '0123456789abcdef0123456789abcdef',
      },
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
    }
    const storage = new CloudinaryImageStorage(
      {
        cloudName: 'cloud',
        apiKey: 'key',
        apiSecret: 'api-secret',
        authTokenKey: '0123456789abcdef0123456789abcdef',
      },
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
        auth_token: { duration: 300 },
      }),
    )
    const expiresAt = Math.floor(result.expiresAt.getTime() / 1000)
    expect(expiresAt).toBeGreaterThanOrEqual(Math.floor(before / 1000) + 299)
    expect(expiresAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 300)
    expect(result.url).toBe('https://signed.example.test/photo')
    expect(result.expiresAt.getTime()).toBe(expiresAt * 1000)
  })

  it('maps the separately provisioned auth-token key through the real SDK contract without network access', async () => {
    const storage = new CloudinaryImageStorage({
      cloudName: 'demo',
      apiKey: 'api-key',
      apiSecret: 'api-secret',
      authTokenKey: '0123456789abcdef0123456789abcdef',
    })

    const result = await storage.createViewUrl('tickets/society/ticket/photo')

    expect(result.url).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo\/image\/authenticated\/v1\/tickets\/society\/ticket\/photo\?__cld_token__=exp=.*~hmac=.*&_a=/,
    )
    expect(result.url).toContain('~hmac=')
  })
})
