import { Schema, Types, model, type HydratedDocument } from 'mongoose'

export const ticketStatuses = [
  'open',
  'assigned',
  'in_progress',
  'awaiting_verification',
  'completed',
  'cancelled',
] as const
export type TicketStatus = (typeof ticketStatuses)[number]

export const activeTicketStatuses = [
  'open',
  'assigned',
  'in_progress',
  'awaiting_verification',
] as const

export interface Ticket {
  _id: Types.ObjectId
  societyId: Types.ObjectId
  unitId: Types.ObjectId
  assetId: Types.ObjectId | null
  reporterId: Types.ObjectId
  title: string
  description: string
  status: TicketStatus
  assigneeId: Types.ObjectId | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const ticketSchema = new Schema<Ticket>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ticketStatuses,
      required: true,
      default: 'open',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _document: HydratedDocument<Ticket>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        for (const key of [
          'societyId',
          'unitId',
          'assetId',
          'reporterId',
          'assigneeId',
        ]) {
          if (ret[key] instanceof Types.ObjectId) ret[key] = ret[key].toString()
        }
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

ticketSchema.index({
  societyId: 1,
  archivedAt: 1,
  status: 1,
  updatedAt: -1,
  _id: -1,
})
ticketSchema.index({
  societyId: 1,
  reporterId: 1,
  archivedAt: 1,
  updatedAt: -1,
  _id: -1,
})
ticketSchema.index({
  societyId: 1,
  assigneeId: 1,
  archivedAt: 1,
  updatedAt: -1,
  _id: -1,
})
ticketSchema.index({ societyId: 1, unitId: 1, archivedAt: 1, status: 1 })
ticketSchema.index({
  societyId: 1,
  assetId: 1,
  archivedAt: 1,
  status: 1,
  updatedAt: -1,
  _id: -1,
})

export const TicketModel = model<Ticket>('Ticket', ticketSchema)
