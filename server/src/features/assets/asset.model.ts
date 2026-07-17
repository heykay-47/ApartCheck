import { Schema, Types, model, type HydratedDocument } from 'mongoose'

export const assetCategories = ['lift', 'plumbing', 'electrical'] as const
export type AssetCategory = (typeof assetCategories)[number]

export interface Asset {
  societyId: Types.ObjectId
  assetCode: string
  name: string
  category: AssetCategory
  locationDescription: string
  installDate: Date | null
  qrToken: string
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const assetSchema = new Schema<Asset>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    assetCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: assetCategories, required: true },
    locationDescription: { type: String, required: true, trim: true },
    installDate: { type: Date, default: null },
    qrToken: { type: String, required: true, select: false },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<Asset>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        if (ret.societyId instanceof Types.ObjectId)
          ret.societyId = ret.societyId.toString()
        delete ret._id
        delete ret.__v
        delete ret.qrToken
        return ret
      },
    },
  },
)

assetSchema.index({ societyId: 1, assetCode: 1 }, { unique: true })
assetSchema.index({ qrToken: 1 }, { unique: true })
assetSchema.index({ societyId: 1, category: 1, archivedAt: 1 })

export const AssetModel = model<Asset>('Asset', assetSchema)
