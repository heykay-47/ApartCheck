import type { RequestHandler } from 'express'
import {
  assetCreateSchema,
  assetListSchema,
  assetUpdateSchema,
} from './asset.schema.js'
import { AssetService } from './asset.service.js'

function id(request: Parameters<RequestHandler>[0]): string {
  return typeof request.params.id === 'string' ? request.params.id : ''
}

function safeAsset(asset: unknown) {
  const value =
    (asset as { toJSON?: () => Record<string, unknown> }).toJSON?.() ?? asset
  if (value && typeof value === 'object')
    delete (value as Record<string, unknown>).qrToken
  return value
}

export const listAssets: RequestHandler = async (request, response, next) => {
  try {
    const result = await AssetService.list(
      request.actor.societyId,
      assetListSchema.parse(request.query),
    )
    response.json({ ...result, assets: result.assets.map(safeAsset) })
  } catch (error) {
    next(error)
  }
}

export const createAsset: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      asset: safeAsset(
        await AssetService.create(
          request.actor.societyId,
          assetCreateSchema.parse(request.body),
        ),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const getAsset: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      asset: safeAsset(
        await AssetService.get(request.actor.societyId, id(request)),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const updateAsset: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      asset: safeAsset(
        await AssetService.update(
          request.actor.societyId,
          id(request),
          assetUpdateSchema.parse(request.body),
        ),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const archiveAsset: RequestHandler = async (request, response, next) => {
  try {
    await AssetService.archive(request.actor.societyId, id(request))
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

export const downloadQr: RequestHandler = async (request, response, next) => {
  try {
    const { asset, svg } = await AssetService.qr(
      request.actor.societyId,
      id(request),
    )
    response
      .type('image/svg+xml')
      .set(
        'Content-Disposition',
        `attachment; filename="${asset.assetCode}.svg"`,
      )
      .send(svg)
  } catch (error) {
    next(error)
  }
}

export const scanAsset: RequestHandler = async (request, response, next) => {
  try {
    const token =
      typeof request.params.token === 'string' ? request.params.token : ''
    response.json({
      asset: safeAsset(await AssetService.scan(request.actor.societyId, token)),
    })
  } catch (error) {
    next(error)
  }
}
