import { Schema, Types, model, type HydratedDocument } from 'mongoose'
import type { AcceptedImageFormat } from '../../storage/image-storage.js'

export const evidenceStates = ['active', 'sealed', 'pending_cleanup'] as const
export type EvidenceState = (typeof evidenceStates)[number]

export interface TicketEvidence {
  _id: Types.ObjectId
  societyId: Types.ObjectId
  ticketId: Types.ObjectId
  uploaderId: Types.ObjectId
  provider: 'cloudinary'
  assetId: string
  publicId: string
  format: AcceptedImageFormat
  byteSize: number
  width: number
  height: number
  displayOrder: number | null
  state: EvidenceState
  evidenceSetNumber: number | null
  createdAt: Date
  updatedAt: Date
  sealedAt: Date | null
  removedAt: Date | null
}

export type TicketEvidenceDto = {
  id: string
  format: TicketEvidence['format']
  byteSize: number
  width: number
  height: number
  displayOrder: number | null
  state: EvidenceState
  evidenceSetNumber: number | null
  createdAt: Date
  sealedAt: Date | null
}

export function toTicketEvidenceDto(
  evidence: TicketEvidence,
): TicketEvidenceDto {
  return {
    id: evidence._id.toString(),
    format: evidence.format,
    byteSize: evidence.byteSize,
    width: evidence.width,
    height: evidence.height,
    displayOrder: evidence.displayOrder,
    state: evidence.state,
    evidenceSetNumber: evidence.evidenceSetNumber,
    createdAt: evidence.createdAt,
    sealedAt: evidence.sealedAt,
  }
}

const ticketEvidenceSchema = new Schema<TicketEvidence>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['cloudinary'], required: true },
    assetId: { type: String, required: true },
    publicId: { type: String, required: true },
    format: { type: String, enum: ['jpeg', 'png', 'webp'], required: true },
    byteSize: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    displayOrder: { type: Number, default: null },
    state: {
      type: String,
      enum: evidenceStates,
      required: true,
      default: 'active',
    },
    evidenceSetNumber: { type: Number, default: null },
    sealedAt: { type: Date, default: null },
    removedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<TicketEvidence>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        for (const key of ['societyId', 'ticketId', 'uploaderId']) {
          if (ret[key] instanceof Types.ObjectId) ret[key] = ret[key].toString()
        }
        delete ret._id
        delete ret.__v
        delete ret.provider
        delete ret.assetId
        delete ret.publicId
        return ret
      },
    },
  },
)

ticketEvidenceSchema.index({ societyId: 1, ticketId: 1, state: 1 })
ticketEvidenceSchema.index({
  societyId: 1,
  ticketId: 1,
  state: 1,
  createdAt: 1,
  _id: 1,
})
ticketEvidenceSchema.index({
  societyId: 1,
  ticketId: 1,
  evidenceSetNumber: 1,
  displayOrder: 1,
})

export const TicketEvidenceModel = model<TicketEvidence>(
  'TicketEvidence',
  ticketEvidenceSchema,
)
