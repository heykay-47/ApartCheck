import { AppError } from '../../http/app-error.js'
import { env } from '../../config/env.js'
import { AssetModel } from './asset.model.js'
import { generateAssetCode, generateQrToken } from './asset-code.js'
import type { AssetInput, AssetList } from './asset.schema.js'
import QRCode from 'qrcode'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unavailable(): AppError {
  return new AppError(404, 'ASSET_UNAVAILABLE', 'Asset is unavailable.')
}

function notFound(): AppError {
  return new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.')
}

function documentInput(input: AssetInput) {
  return {
    ...input,
    installDate: input.installDate ? new Date(input.installDate) : null,
  }
}

function duplicate(error: unknown): boolean {
  return (error as { code?: number }).code === 11000
}

export const AssetService = {
  async list(societyId: string, input: AssetList) {
    const filter: Record<string, unknown> = { societyId, archivedAt: null }
    if (input.category) filter.category = input.category
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [
        { assetCode: search },
        { name: search },
        { locationDescription: search },
      ]
    }
    const skip = (input.page - 1) * input.pageSize
    const [items, total] = await Promise.all([
      AssetModel.find(filter)
        .sort({ assetCode: 1 })
        .skip(skip)
        .limit(input.pageSize),
      AssetModel.countDocuments(filter),
    ])
    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total,
      pages: Math.ceil(total / input.pageSize),
    }
  },

  async create(societyId: string, input: AssetInput) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await AssetModel.create({
          societyId,
          assetCode: generateAssetCode(input.category),
          qrToken: generateQrToken(),
          ...documentInput(input),
        })
      } catch (error) {
        if (!duplicate(error) || attempt === 4) throw error
      }
    }
    throw new Error('Asset creation failed.')
  },

  async get(societyId: string, assetId: string) {
    const asset = await AssetModel.findOne({
      _id: assetId,
      societyId,
      archivedAt: null,
    })
    if (!asset) throw notFound()
    return asset
  },

  async update(societyId: string, assetId: string, input: AssetInput) {
    const asset = await AssetModel.findOneAndUpdate(
      { _id: assetId, societyId, archivedAt: null },
      { $set: documentInput(input) },
      { returnDocument: 'after', runValidators: true },
    )
    if (!asset) throw notFound()
    return asset
  },

  async archive(societyId: string, assetId: string) {
    const asset = await AssetModel.findOneAndUpdate(
      { _id: assetId, societyId, archivedAt: null },
      { $set: { archivedAt: new Date() } },
    )
    if (!asset) throw notFound()
  },

  async qr(societyId: string, assetId: string) {
    const asset = await AssetModel.findOne({
      _id: assetId,
      societyId,
      archivedAt: null,
    }).select('+qrToken')
    if (!asset) throw notFound()
    const url = new URL(`/scan/${asset.qrToken}`, env.APP_BASE_URL).toString()
    return {
      asset,
      svg: await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
      }),
    }
  },

  async scan(societyId: string, qrToken: string) {
    const asset = await AssetModel.findOne({
      societyId,
      qrToken,
      archivedAt: null,
    })
    if (!asset) throw unavailable()
    return asset
  },
}
