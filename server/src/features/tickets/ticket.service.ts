import mongoose, { Types } from 'mongoose'
import { AppError } from '../../http/app-error.js'
import { AssetModel } from '../assets/asset.model.js'
import { guardSocietyMutation } from '../societies/society-transaction.js'
import { UnitModel } from '../units/unit.model.js'
import { UserModel } from '../users/user.model.js'
import {
  TicketModel,
  activeTicketStatuses,
  type Ticket,
  type TicketStatus,
} from './ticket.model.js'
import { TicketEventModel, type TicketEventType } from './ticket-event.model.js'
import type {
  AssetTicketListInput,
  EligibleTechnicianInput,
  TicketAssignmentInput,
  TicketCancelInput,
  TicketCreateInput,
  TicketListInput,
  TicketReopenInput,
  TicketReturnInput,
  TicketSubmitInput,
} from './ticket.schema.js'

const ticketNotFound = () =>
  new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
const invalidTransition = () =>
  new AppError(
    409,
    'TICKET_INVALID_TRANSITION',
    'Ticket cannot make that transition.',
  )
const assigneeInvalid = () =>
  new AppError(404, 'TICKET_ASSIGNEE_INVALID', 'Technician is unavailable.')
const assignmentUnchanged = () =>
  new AppError(
    409,
    'TICKET_ASSIGNMENT_UNCHANGED',
    'Technician is already assigned.',
  )
const reassignmentRequired = () =>
  new AppError(
    409,
    'TICKET_REASSIGNMENT_REQUIRED',
    'Reassign an active technician before reopening this ticket.',
  )
const linkUnavailable = () =>
  new AppError(
    409,
    'TICKET_LINK_UNAVAILABLE',
    'Reopening requires all linked records to be active.',
  )

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function validId(value: string): boolean {
  return Types.ObjectId.isValid(value)
}
function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, pages: Math.ceil(total / pageSize) }
}
function idOf(value: unknown): string {
  if (value instanceof Types.ObjectId) return value.toString()
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && '_id' in value)
    return idOf(value._id)
  return ''
}
function visibleFilter(actor: Express.Actor): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    societyId: actor.societyId,
    archivedAt: null,
  }
  if (actor.role === 'resident') filter.reporterId = actor.userId
  if (actor.role === 'technician') filter.assigneeId = actor.userId
  return filter
}

async function findVisible(
  actor: Express.Actor,
  ticketId: string,
  session?: mongoose.ClientSession,
) {
  if (!validId(ticketId)) throw ticketNotFound()
  const query = TicketModel.findOne({ ...visibleFilter(actor), _id: ticketId })
  if (session) query.session(session)
  const ticket = await query
  if (!ticket) throw ticketNotFound()
  return ticket
}

async function appendEvent(
  societyId: string,
  actorId: string,
  ticketId: Types.ObjectId,
  event: {
    type: TicketEventType
    fromStatus: TicketStatus | null
    toStatus: TicketStatus
    assigneeId: Types.ObjectId | null
    note: string | null
  },
  session: mongoose.ClientSession,
) {
  await TicketEventModel.create([{ societyId, ticketId, actorId, ...event }], {
    session,
  })
}

async function activeUnit(
  societyId: string,
  unitId: string,
  session?: mongoose.ClientSession,
) {
  if (!validId(unitId))
    throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')
  const query = UnitModel.findOne({ _id: unitId, societyId, archivedAt: null })
  if (session) query.session(session)
  const unit = await query
  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')
  return unit
}
async function activeAsset(
  societyId: string,
  assetId: string,
  session?: mongoose.ClientSession,
) {
  if (!validId(assetId))
    throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.')
  const query = AssetModel.findOne({
    _id: assetId,
    societyId,
    archivedAt: null,
  })
  if (session) query.session(session)
  const asset = await query
  if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found.')
  return asset
}

async function eligibleTechnician(
  societyId: string,
  technicianId: string,
  session?: mongoose.ClientSession,
) {
  if (!validId(technicianId)) throw assigneeInvalid()
  const query = UserModel.findOne({
    _id: technicianId,
    societyId,
    active: true,
    role: 'technician',
  })
  if (session) query.session(session)
  const user = await query
  if (!user) throw assigneeInvalid()
  return user
}

async function refsFor(ticket: Ticket) {
  const [unit, asset, reporter, assignee] = await Promise.all([
    UnitModel.findOne({ _id: ticket.unitId, societyId: ticket.societyId }),
    ticket.assetId
      ? AssetModel.findOne({ _id: ticket.assetId, societyId: ticket.societyId })
      : null,
    UserModel.findOne({ _id: ticket.reporterId, societyId: ticket.societyId }),
    ticket.assigneeId
      ? UserModel.findOne({
          _id: ticket.assigneeId,
          societyId: ticket.societyId,
        })
      : null,
  ])
  return { unit, asset, reporter, assignee }
}

async function summary(ticket: Ticket) {
  const { unit, asset, reporter, assignee } = await refsFor(ticket)
  return {
    id: idOf(ticket._id),
    title: ticket.title,
    status: ticket.status,
    unit: {
      id: idOf(ticket.unitId),
      building: unit?.building ?? 'Unavailable',
      floor: unit?.floor ?? 'Unavailable',
      unitNumber: unit?.unitNumber ?? 'Unavailable',
      active: Boolean(unit && !unit.archivedAt),
    },
    asset: ticket.assetId
      ? {
          id: idOf(ticket.assetId),
          assetCode: asset?.assetCode ?? 'Unavailable',
          name: asset?.name ?? 'Unavailable',
          active: Boolean(asset && !asset.archivedAt),
        }
      : null,
    reporter: {
      id: idOf(ticket.reporterId),
      name: reporter?.name ?? 'Unavailable',
    },
    assignee: ticket.assigneeId
      ? {
          id: idOf(ticket.assigneeId),
          name: assignee?.name ?? 'Unavailable',
          active: Boolean(assignee?.active),
          role: assignee?.role ?? null,
        }
      : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  }
}

async function detail(ticket: Ticket) {
  const events = await TicketEventModel.find({
    societyId: ticket.societyId,
    ticketId: ticket._id,
  }).sort({ createdAt: 1, _id: 1 })
  const userIds = new Set<string>()
  for (const event of events) {
    userIds.add(idOf(event.actorId))
    if (event.assigneeId) userIds.add(idOf(event.assigneeId))
  }
  const users = await UserModel.find({
    societyId: ticket.societyId,
    _id: { $in: [...userIds] },
  })
  const byId = new Map(users.map((user) => [idOf(user._id), user]))
  return {
    ...(await summary(ticket)),
    description: ticket.description,
    events: events.map((event) => ({
      id: idOf(event._id),
      type: event.type,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      assigneeId: event.assigneeId ? idOf(event.assigneeId) : null,
      actor: {
        id: idOf(event.actorId),
        name: byId.get(idOf(event.actorId))?.name ?? 'Unavailable',
      },
      assignee: event.assigneeId
        ? {
            id: idOf(event.assigneeId),
            name: byId.get(idOf(event.assigneeId))?.name ?? 'Unavailable',
          }
        : null,
      note: event.note,
      createdAt: event.createdAt,
    })),
  }
}

async function replaceAndEvent(
  actor: Express.Actor,
  ticketId: string,
  transition: {
    allowed: TicketStatus[]
    toStatus: TicketStatus
    type: TicketEventType
    assignee?: Types.ObjectId | null
    note?: string | null
  },
  extra?: (ticket: Ticket, session: mongoose.ClientSession) => Promise<void>,
) {
  await mongoose.connection.transaction(async (session) => {
    await guardSocietyMutation(actor.societyId, session)
    const ticket = await findVisible(actor, ticketId, session)
    if (!transition.allowed.includes(ticket.status)) throw invalidTransition()
    if (extra) await extra(ticket, session)
    const from = ticket.status
    ticket.status = transition.toStatus
    if (transition.assignee !== undefined)
      ticket.assigneeId = transition.assignee
    await ticket.save({ session })
    await appendEvent(
      actor.societyId,
      actor.userId,
      ticket._id,
      {
        type: transition.type,
        fromStatus: from,
        toStatus: ticket.status,
        assigneeId: ticket.assigneeId,
        note: transition.note ?? null,
      },
      session,
    )
  })
  return detail(await findVisible(actor, ticketId))
}

export const TicketService = {
  async list(actor: Express.Actor, input: TicketListInput) {
    const filter = visibleFilter(actor)
    if (input.status) filter.status = input.status
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [{ title: search }, { description: search }]
    }
    const skip = (input.page - 1) * input.pageSize
    const [documents, total] = await Promise.all([
      TicketModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(input.pageSize),
      TicketModel.countDocuments(filter),
    ])
    return {
      tickets: await Promise.all(documents.map(summary)),
      pagination: pagination(input.page, input.pageSize, total),
    }
  },

  async get(actor: Express.Actor, ticketId: string) {
    return detail(await findVisible(actor, ticketId))
  },

  async listActiveForAsset(
    actor: Express.Actor,
    assetId: string,
    input: AssetTicketListInput,
  ) {
    await activeAsset(actor.societyId, assetId)
    const filter = {
      ...visibleFilter(actor),
      assetId,
      status: { $in: activeTicketStatuses },
    }
    const skip = (input.page - 1) * input.pageSize
    const [documents, total] = await Promise.all([
      TicketModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(input.pageSize),
      TicketModel.countDocuments(filter),
    ])
    return {
      tickets: await Promise.all(documents.map(summary)),
      pagination: pagination(input.page, input.pageSize, total),
    }
  },

  async eligibleTechnicians(
    actor: Express.Actor,
    input: EligibleTechnicianInput,
  ) {
    const filter: Record<string, unknown> = {
      societyId: actor.societyId,
      role: 'technician',
      active: true,
    }
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [{ name: search }, { email: search }]
    }
    const skip = (input.page - 1) * input.pageSize
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(input.pageSize),
      UserModel.countDocuments(filter),
    ])
    return {
      technicians: users.map((user) => ({
        id: idOf(user._id),
        name: user.name,
        email: user.email,
      })),
      pagination: pagination(input.page, input.pageSize, total),
    }
  },

  async create(actor: Express.Actor, input: TicketCreateInput) {
    if (actor.role !== 'admin' && actor.role !== 'resident')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    let createdId = ''
    await mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(actor.societyId, session)
      if (actor.role === 'resident' && actor.unitId !== input.unitId)
        throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')
      await activeUnit(actor.societyId, input.unitId, session)
      if (input.assetId)
        await activeAsset(actor.societyId, input.assetId, session)
      const [created] = await TicketModel.create(
        [
          {
            societyId: actor.societyId,
            unitId: input.unitId,
            assetId: input.assetId ?? null,
            reporterId: actor.userId,
            title: input.title,
            description: input.description,
            status: 'open',
            assigneeId: null,
            archivedAt: null,
          },
        ],
        { session },
      )
      if (!created) throw new Error('Ticket creation returned no document.')
      createdId = idOf(created._id)
      await appendEvent(
        actor.societyId,
        actor.userId,
        created._id,
        {
          type: 'created',
          fromStatus: null,
          toStatus: 'open',
          assigneeId: null,
          note: null,
        },
        session,
      )
    })
    return detail(await findVisible(actor, createdId))
  },

  async assign(
    actor: Express.Actor,
    ticketId: string,
    input: TicketAssignmentInput,
  ) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    await mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(actor.societyId, session)
      const ticket = await findVisible(actor, ticketId, session)
      const technician = await eligibleTechnician(
        actor.societyId,
        input.technicianId,
        session,
      )
      const current = ticket.assigneeId ? idOf(ticket.assigneeId) : null
      if (current === input.technicianId) throw assignmentUnchanged()
      const legal = ['open', 'assigned', 'in_progress'].includes(ticket.status)
      const repair =
        ticket.status === 'completed' &&
        !(await UserModel.exists({
          _id: ticket.assigneeId,
          societyId: actor.societyId,
          role: 'technician',
          active: true,
        }).session(session))
      if (!legal && !repair) throw invalidTransition()
      const from = ticket.status
      if (repair) {
        ticket.assigneeId = technician._id
        await ticket.save({ session })
        await appendEvent(
          actor.societyId,
          actor.userId,
          ticket._id,
          {
            type: 'reassigned',
            fromStatus: from,
            toStatus: from,
            assigneeId: technician._id,
            note: null,
          },
          session,
        )
        return
      }
      ticket.assigneeId = technician._id
      if (ticket.status === 'open') ticket.status = 'assigned'
      await ticket.save({ session })
      await appendEvent(
        actor.societyId,
        actor.userId,
        ticket._id,
        {
          type:
            ticket.status === 'assigned' && from === 'open'
              ? 'assigned'
              : 'reassigned',
          fromStatus: from,
          toStatus: ticket.status,
          assigneeId: technician._id,
          note: null,
        },
        session,
      )
    })
    return detail(await findVisible(actor, ticketId))
  },

  async startWork(actor: Express.Actor, ticketId: string) {
    if (actor.role !== 'technician')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(
      actor,
      ticketId,
      {
        allowed: ['assigned'],
        toStatus: 'in_progress',
        type: 'work_started',
        assignee: new Types.ObjectId(actor.userId),
      },
      async (ticket, session) => {
        if (
          idOf(ticket.assigneeId) !== actor.userId ||
          !(await UserModel.exists({
            _id: actor.userId,
            societyId: actor.societyId,
            active: true,
            role: 'technician',
          }).session(session))
        )
          throw invalidTransition()
      },
    )
  },

  async submitForVerification(
    actor: Express.Actor,
    ticketId: string,
    input: TicketSubmitInput,
  ) {
    if (actor.role !== 'technician')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(
      actor,
      ticketId,
      {
        allowed: ['in_progress'],
        toStatus: 'awaiting_verification',
        type: 'submitted_for_verification',
        assignee: new Types.ObjectId(actor.userId),
        note: input.completionSummary,
      },
      async (ticket, session) => {
        if (
          idOf(ticket.assigneeId) !== actor.userId ||
          !(await UserModel.exists({
            _id: actor.userId,
            societyId: actor.societyId,
            active: true,
            role: 'technician',
          }).session(session))
        )
          throw invalidTransition()
      },
    )
  },
  async returnForRework(
    actor: Express.Actor,
    ticketId: string,
    input: TicketReturnInput,
  ) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(actor, ticketId, {
      allowed: ['awaiting_verification'],
      toStatus: 'in_progress',
      type: 'returned',
      note: input.reason,
    })
  },

  async verify(actor: Express.Actor, ticketId: string) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(actor, ticketId, {
      allowed: ['awaiting_verification'],
      toStatus: 'completed',
      type: 'verified',
    })
  },

  async reopen(
    actor: Express.Actor,
    ticketId: string,
    input: TicketReopenInput,
  ) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(
      actor,
      ticketId,
      {
        allowed: ['completed'],
        toStatus: 'assigned',
        type: 'reopened',
        note: input.reason,
      },
      async (ticket, session) => {
        const assignee = ticket.assigneeId
          ? await UserModel.findOne({
              _id: ticket.assigneeId,
              societyId: actor.societyId,
              role: 'technician',
              active: true,
            }).session(session)
          : null
        if (!assignee) throw reassignmentRequired()
        const unit = await UnitModel.findOne({
          _id: ticket.unitId,
          societyId: actor.societyId,
          archivedAt: null,
        }).session(session)
        const asset = ticket.assetId
          ? await AssetModel.findOne({
              _id: ticket.assetId,
              societyId: actor.societyId,
              archivedAt: null,
            }).session(session)
          : true
        if (!unit || !asset) throw linkUnavailable()
      },
    )
  },

  async cancel(
    actor: Express.Actor,
    ticketId: string,
    input: TicketCancelInput,
  ) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    return replaceAndEvent(actor, ticketId, {
      allowed: [...activeTicketStatuses],
      toStatus: 'cancelled',
      type: 'cancelled',
      note: input.reason,
    })
  },

  async archive(actor: Express.Actor, ticketId: string) {
    if (actor.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    await mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(actor.societyId, session)
      const ticket = await findVisible(actor, ticketId, session)
      if (!['completed', 'cancelled'].includes(ticket.status))
        throw invalidTransition()
      ticket.archivedAt = new Date()
      await ticket.save({ session })
      await appendEvent(
        actor.societyId,
        actor.userId,
        ticket._id,
        {
          type: 'archived',
          fromStatus: ticket.status,
          toStatus: ticket.status,
          assigneeId: ticket.assigneeId,
          note: null,
        },
        session,
      )
    })
  },
}

export type TicketSummary = Awaited<ReturnType<typeof summary>>
export type TicketDetail = Awaited<ReturnType<typeof detail>>
