import { Schema, Types, model, type HydratedDocument } from 'mongoose'

export interface Unit {
  societyId: Types.ObjectId
  building: string
  floor: string
  unitNumber: string
  buildingKey: string
  floorKey: string
  unitNumberKey: string
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const normalize = (value: string): string => value.trim().toLowerCase()

const unitSchema = new Schema<Unit>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    building: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
    unitNumber: { type: String, required: true, trim: true },
    buildingKey: { type: String, required: true },
    floorKey: { type: String, required: true },
    unitNumberKey: { type: String, required: true },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<Unit>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        delete ret._id
        delete ret.__v
        delete ret.buildingKey
        delete ret.floorKey
        delete ret.unitNumberKey
        return ret
      },
    },
  },
)

unitSchema.pre('validate', function () {
  this.buildingKey = normalize(this.building)
  this.floorKey = normalize(this.floor)
  this.unitNumberKey = normalize(this.unitNumber)
})

unitSchema.index(
  { societyId: 1, buildingKey: 1, floorKey: 1, unitNumberKey: 1 },
  { unique: true },
)

export const UnitModel = model<Unit>('Unit', unitSchema)
