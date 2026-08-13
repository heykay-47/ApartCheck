import { Schema, Types, model, type HydratedDocument } from 'mongoose'
import { ticketStatuses, type TicketStatus } from './ticket.model.js'

export const ticketEventTypes = [
  'created',
  'assigned',
  'reassigned',
  'work_started',
  'submitted_for_verification',
  'returned',
  'verified',
  'reopened',
  'cancelled',
  'archived',
] as const
export type TicketEventType = (typeof ticketEventTypes)[number]

export interface TicketEvent {
  societyId: Types.ObjectId
  ticketId: Types.ObjectId
  actorId: Types.ObjectId
  type: TicketEventType
  fromStatus: TicketStatus | null
  toStatus: TicketStatus
  assigneeId: Types.ObjectId | null
  note: string | null
  createdAt: Date
}

const ticketEventSchema = new Schema<TicketEvent>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ticketEventTypes, required: true },
    fromStatus: {
      type: String,
      enum: [...ticketStatuses, null],
      default: null,
    },
    toStatus: { type: String, enum: ticketStatuses, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    _id: true,
    timestamps: false,
    toJSON: {
      transform: (
        _document: HydratedDocument<TicketEvent>,
        ret: Record<string, unknown>,
      ) => {
        ret.id = ret._id?.toString()
        for (const key of ['societyId', 'ticketId', 'actorId', 'assigneeId']) {
          if (ret[key] instanceof Types.ObjectId) ret[key] = ret[key].toString()
        }
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

ticketEventSchema.index({ societyId: 1, ticketId: 1, createdAt: 1, _id: 1 })

export const TicketEventModel = model<TicketEvent>(
  'TicketEvent',
  ticketEventSchema,
)
