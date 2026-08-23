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
      },
      client as never,
    )

    const result = await storage.uploadImage(input())

    expect(client.config).toHaveBeenCalledWith({
      cloud_name: 'cloud',
      api_key: 'key',
      api_secret: 'api-secret',
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
      },
      client as never,
    )

    await storage.deleteImage('tickets/society/ticket/photo')

    expect(client.uploader.destroy).toHaveBeenCalledWith(
      'tickets/society/ticket/photo',
      { resource_type: 'image', type: 'authenticated', invalidate: true },
    )
  })

  it('fetches bytes through an internally signed authenticated URL', async () => {
    const client = {
      config: vi.fn(),
      uploader: { upload_stream: vi.fn(), destroy: vi.fn() },
      url: vi.fn().mockReturnValue('https://signed.cloudinary.test/internal'),
    }
    const fetchImage = vi.fn().mockResolvedValue(
      new Response(Buffer.from('cloudinary-image'), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    )
    const storage = new CloudinaryImageStorage(
      {
        cloudName: 'cloud',
        apiKey: 'key',
        apiSecret: 'api-secret',
      },
      client as never,
      fetchImage,
    )

    await expect(
      storage.readImage('tickets/society/ticket/photo'),
    ).resolves.toEqual(Buffer.from('cloudinary-image'))

    expect(client.url).toHaveBeenCalledWith('tickets/society/ticket/photo', {
      resource_type: 'image',
      type: 'authenticated',
      secure: true,
      sign_url: true,
    })
    expect(fetchImage).toHaveBeenCalledWith(
      'https://signed.cloudinary.test/internal',
    )
  })

  it('rejects non-successful provider responses without returning provider content', async () => {
    const client = {
      config: vi.fn(),
      uploader: { upload_stream: vi.fn(), destroy: vi.fn() },
      url: vi.fn().mockReturnValue('https://signed.cloudinary.test/internal'),
    }
    const fetchImage = vi
      .fn()
      .mockResolvedValue(
        new Response('provider failure details', { status: 404 }),
      )
    const storage = new CloudinaryImageStorage(
      {
        cloudName: 'cloud',
        apiKey: 'key',
        apiSecret: 'api-secret',
      },
      client as never,
      fetchImage,
    )

    const error = await storage
      .readImage('tickets/society/ticket/photo')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Cloudinary image is unavailable.')
    expect((error as Error).message).not.toContain('provider failure details')
    expect(fetchImage).toHaveBeenCalledOnce()
  })
})
