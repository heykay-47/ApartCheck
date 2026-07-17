import { AppError } from '../../http/app-error.js'
import { UserModel } from '../users/user.model.js'
import { UnitModel } from './unit.model.js'
import type { UnitInput, UnitList } from './unit.schema.js'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unitNotFound(): AppError {
  return new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')
}

function duplicateUnit(): AppError {
  return new AppError(409, 'DUPLICATE_UNIT', 'Unit already exists.')
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
      items,
      page: input.page,
      pageSize: input.pageSize,
      total,
      pages: Math.ceil(total / input.pageSize),
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
    try {
      const unit = await UnitModel.findOneAndUpdate(
        { _id: unitId, societyId, archivedAt: null },
        { $set: input },
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
    const unit = await UnitModel.findOne({
      _id: unitId,
      societyId,
      archivedAt: null,
    })
    if (!unit) throw unitNotFound()
    return unit
  },

  async archive(societyId: string, unitId: string) {
    const unit = await UnitModel.findOne({
      _id: unitId,
      societyId,
      archivedAt: null,
    })
    if (!unit) throw unitNotFound()
    const activeResidents = await UserModel.countDocuments({
      societyId,
      unitId: unit._id,
      role: 'resident',
      active: true,
    })
    if (activeResidents > 0) {
      throw new AppError(
        409,
        'UNIT_HAS_ACTIVE_RESIDENTS',
        'Unit has active residents and cannot be archived.',
      )
    }
    const archived = await UnitModel.findOneAndUpdate(
      { _id: unitId, societyId, archivedAt: null },
      { $set: { archivedAt: new Date() } },
      { returnDocument: 'after' },
    )
    if (!archived) throw unitNotFound()
  },
}
