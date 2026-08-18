import sharp from 'sharp'
import { AppError } from '../../http/app-error.js'
import type { AcceptedImageFormat } from '../../storage/image-storage.js'

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const MAX_TOTAL_PHOTO_BYTES = 40 * 1024 * 1024
export const MAX_ACTIVE_PHOTOS = 5
export const MAX_PHOTO_DIMENSION = 2048

const acceptedFormats = new Set<AcceptedImageFormat>(['jpeg', 'png', 'webp'])

export type InspectedImage = {
  bytes: Buffer
  format: AcceptedImageFormat
  width: number
  height: number
}

const invalidImage = () =>
  new AppError(
    400,
    'EVIDENCE_INVALID_IMAGE',
    'Use a valid JPEG, PNG, or WebP image.',
  )

export async function inspectImage(bytes: Buffer): Promise<InspectedImage> {
  if (bytes.byteLength > MAX_PHOTO_BYTES)
    throw new AppError(413, 'EVIDENCE_LIMIT_EXCEEDED', 'Photo exceeds 8 MiB')

  try {
    const source = sharp(bytes, { failOn: 'error' })
    const metadata = await source.metadata()
    const format = metadata.format
    if (
      !format ||
      !acceptedFormats.has(format as AcceptedImageFormat) ||
      !metadata.width ||
      !metadata.height
    )
      throw invalidImage()

    const normalized = await source
      .rotate()
      .resize({
        width: MAX_PHOTO_DIMENSION,
        height: MAX_PHOTO_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(format)
      .toBuffer({ resolveWithObject: true })

    if (!normalized.info.width || !normalized.info.height) throw invalidImage()

    return {
      bytes: normalized.data,
      format: format as AcceptedImageFormat,
      width: normalized.info.width,
      height: normalized.info.height,
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw invalidImage()
  }
}
