import { Schema, Types, model, type HydratedDocument } from 'mongoose'

export const userRoles = ['resident', 'admin', 'technician'] as const
export type UserRole = (typeof userRoles)[number]

export interface User {
  name: string
  email: string
  phone: string
  passwordHash: string
  role: UserRole
  societyId: Types.ObjectId
  unitId: Types.ObjectId | null
  mustChangePassword: boolean
  tokenVersion: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, required: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
    mustChangePassword: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<User>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        if (ret.societyId instanceof Types.ObjectId)
          ret.societyId = ret.societyId.toString()
        if (ret.unitId instanceof Types.ObjectId)
          ret.unitId = ret.unitId.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        return ret
      },
    },
  },
)

userSchema.pre('validate', function () {
  if (this.role === 'resident' && !this.unitId) {
    this.invalidate('unitId', 'Residents must have a unit.')
  }
  if (this.role !== 'resident' && this.unitId) {
    this.invalidate('unitId', 'Only residents can have a unit.')
  }
})

userSchema.index({ societyId: 1, email: 1 }, { unique: true })

userSchema.index({ societyId: 1, role: 1, active: 1, name: 1, _id: 1 })

export const UserModel = model<User>('User', userSchema)
