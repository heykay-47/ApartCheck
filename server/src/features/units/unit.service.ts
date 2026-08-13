import mongoose from 'mongoose'
import { AppError } from '../../http/app-error.js'
import { guardSocietyMutation } from '../societies/society-transaction.js'
import { UserModel } from '../users/user.model.js'
import { UnitModel } from './unit.model.js'
import { TicketModel, activeTicketStatuses } from '../tickets/ticket.model.js'
import type { UnitInput, UnitList } from './unit.schema.js'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unitNotFound(): AppError {
  return new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')
}

function assertUnitId(unitId: string): void {
  if (!mongoose.Types.ObjectId.isValid(unitId)) throw unitNotFound()
}

function duplicateUnit(): AppError {
  return new AppError(409, 'DUPLICATE_UNIT', 'Unit already exists.')
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export const UnitService = {
  async list(societyId: string, input: UnitList) {
    const filter: Record<string, unknown> = {
      societyId,
      archivedAt: null,
    }
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [
        { building: search },
        { floor: search },
        { unitNumber: search },
      ]
    }
    const skip = (input.page - 1) * input.pageSize
    const [items, total] = await Promise.all([
      UnitModel.find(filter)
        .sort({ building: 1, floor: 1, unitNumber: 1 })
        .skip(skip)
        .limit(input.pageSize),
      UnitModel.countDocuments(filter),
    ])
    return {
      units: items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        pages: Math.ceil(total / input.pageSize),
      },
    }
  },

  async create(societyId: string, input: UnitInput) {
    try {
      return await UnitModel.create({ societyId, ...input })
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw duplicateUnit()
      throw error
    }
  },

  async update(societyId: string, unitId: string, input: UnitInput) {
    assertUnitId(unitId)
    try {
      const unit = await UnitModel.findOneAndUpdate(
        { _id: unitId, societyId, archivedAt: null },
        {
          $set: {
            ...input,
            buildingKey: normalize(input.building),
            floorKey: normalize(input.floor),
            unitNumberKey: normalize(input.unitNumber),
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      if (!unit) throw unitNotFound()
      return unit
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw duplicateUnit()
      throw error
    }
  },

  async get(societyId: string, unitId: string) {
    assertUnitId(unitId)
    const unit = await UnitModel.findOne({
      _id: unitId,
      societyId,
      archivedAt: null,
    })
    if (!unit) throw unitNotFound()
    return unit
  },

  async getMyUnit(actor: Express.Actor) {
    if (actor.role !== 'resident') {
      throw new AppError(403, 'FORBIDDEN', 'Forbidden.')
    }
    if (!actor.unitId) throw unitNotFound()
    return this.get(actor.societyId, actor.unitId)
  },

  async archive(societyId: string, unitId: string) {
    assertUnitId(unitId)
    await mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(societyId, session)
      const unit = await UnitModel.findOne({
        _id: unitId,
        societyId,
        archivedAt: null,
      }).session(session)
      if (!unit) throw unitNotFound()
      const activeResidents = await UserModel.countDocuments({
        societyId,
        unitId: unit._id,
        role: 'resident',
        active: true,
      }).session(session)
      if (activeResidents > 0) {
        throw new AppError(
          409,
          'UNIT_HAS_ACTIVE_RESIDENTS',
          'Unit has active residents and cannot be archived.',
        )
      }
      const activeTickets = await TicketModel.countDocuments({
        societyId,
        unitId: unit._id,
        archivedAt: null,
        status: { $in: activeTicketStatuses },
      }).session(session)
      if (activeTickets > 0) {
        throw new AppError(
          409,
          'UNIT_HAS_ACTIVE_TICKETS',
          'Unit has active tickets and cannot be archived.',
        )
      }
      const archived = await UnitModel.findOneAndUpdate(
        { _id: unitId, societyId, archivedAt: null },
        { $set: { archivedAt: new Date() } },
        { returnDocument: 'after', session },
      )
      if (!archived) throw unitNotFound()
    })
  },
}
