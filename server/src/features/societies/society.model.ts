import { Schema, model, type HydratedDocument } from 'mongoose'

export interface Society {
  name: string
  address: string
  singletonKey: string
  createdAt: Date
  updatedAt: Date
}

const societySchema = new Schema<Society>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    singletonKey: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<Society>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

societySchema.index({ singletonKey: 1 }, { unique: true })

export const SocietyModel = model<Society>('Society', societySchema)
