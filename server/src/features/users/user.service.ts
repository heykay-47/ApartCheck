import mongoose from 'mongoose'
import { AppError } from '../../http/app-error.js'
import { generateTemporaryPassword, hashPassword } from '../auth/password.js'
import { UnitModel } from '../units/unit.model.js'
import { guardSocietyMutation } from '../societies/society-transaction.js'
import { UserModel, type UserRole } from './user.model.js'
import type {
  UserCreateInput,
  UserListInput,
  UserUpdateInput,
} from './user.schema.js'
import {
  serializeSafeUser,
  type TemporaryCredentialResponse,
} from './user.dto.js'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const notFound = () => new AppError(404, 'USER_NOT_FOUND', 'User not found.')
const unitNotFound = () =>
  new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found.')

function assertUserId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound()
}

async function assertUnit(
  societyId: string,
  unitId: string,
  session?: mongoose.ClientSession,
): Promise<void> {
  const query = UnitModel.exists({ _id: unitId, societyId, archivedAt: null })
  if (session) query.session(session)
  if (!(await query)) throw unitNotFound()
}

function safe(user: Parameters<typeof serializeSafeUser>[0]) {
  return serializeSafeUser(user)
}

async function assertLastAdmin(
  societyId: string,
  targetId: string,
  nextRole: UserRole,
  session: mongoose.ClientSession,
): Promise<void> {
  if (nextRole === 'admin') return
  const target = await UserModel.findOne({
    _id: targetId,
    societyId,
    active: true,
    role: 'admin',
  }).session(session)
  if (!target) return
  if (
    (await UserModel.countDocuments({
      societyId,
      role: 'admin',
      active: true,
    }).session(session)) <= 1
  ) {
    throw new AppError(
      409,
      'LAST_ACTIVE_ADMIN',
      'Last active admin cannot be demoted or disabled.',
    )
  }
}

async function credential(
  user: Parameters<typeof serializeSafeUser>[0],
  password: string,
): Promise<TemporaryCredentialResponse> {
  return { user: safe(user), temporaryPassword: password }
}

export const UserService = {
  async list(societyId: string, input: UserListInput) {
    const filter: Record<string, unknown> = { societyId }
    if (input.role) filter.role = input.role
    if (input.active !== undefined) filter.active = input.active
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [{ name: search }, { email: search }, { phone: search }]
    }
    const skip = (input.page - 1) * input.pageSize
    const [documents, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(skip)
        .limit(input.pageSize),
      UserModel.countDocuments(filter),
    ])
    return {
      users: documents.map(safe),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        pages: Math.ceil(total / input.pageSize),
      },
    }
  },

  async create(
    societyId: string,
    input: UserCreateInput,
  ): Promise<TemporaryCredentialResponse> {
    const temporaryPassword = generateTemporaryPassword()
    try {
      return await mongoose.connection.transaction(async (session) => {
        await guardSocietyMutation(societyId, session)
        if (input.role === 'resident')
          await assertUnit(societyId, input.unitId!, session)
        const user = await UserModel.create(
          [
            {
              ...input,
              societyId,
              unitId: input.role === 'resident' ? input.unitId! : null,
              passwordHash: await hashPassword(temporaryPassword),
              mustChangePassword: true,
              tokenVersion: 0,
              active: true,
            },
          ],
          { session },
        ).then(([created]) => created)
        if (!user) throw new Error('User creation returned no document.')
        return credential(user, temporaryPassword)
      })
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new AppError(
          409,
          'DUPLICATE_RESOURCE',
          'Resource already exists.',
        )
      throw error
    }
  },

  async update(societyId: string, id: string, input: UserUpdateInput) {
    assertUserId(id)
    return mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(societyId, session)
      const current = await UserModel.findOne({ _id: id, societyId })
        .session(session)
        .select('+tokenVersion')
      if (!current) throw notFound()
      const nextRole = input.role ?? current.role
      const nextUnit =
        nextRole === 'resident' ? (input.unitId ?? current.unitId) : null
      if (nextRole === 'resident' && !nextUnit)
        throw new AppError(400, 'VALIDATION_ERROR', 'Residents require a unit.')
      if (nextRole === 'resident')
        await assertUnit(societyId, String(nextUnit), session)
      await assertLastAdmin(societyId, id, nextRole, session)
      const updated = await UserModel.findOneAndUpdate(
        { _id: id, societyId },
        {
          $set: { ...input, role: nextRole, unitId: nextUnit },
          $inc: { tokenVersion: 1 },
        },
        { returnDocument: 'after', runValidators: true, session },
      ).select('+tokenVersion')
      if (!updated) throw notFound()
      return { user: safe(updated) }
    })
  },

  async setStatus(societyId: string, id: string, active: boolean) {
    assertUserId(id)
    return mongoose.connection.transaction(async (session) => {
      await guardSocietyMutation(societyId, session)
      const current = await UserModel.findOne({ _id: id, societyId })
        .session(session)
        .select('+tokenVersion')
      if (!current) throw notFound()
      if (!active) await assertLastAdmin(societyId, id, current.role, session)
      const updated = await UserModel.findOneAndUpdate(
        { _id: id, societyId },
        { $set: { active }, $inc: { tokenVersion: 1 } },
        { returnDocument: 'after', session },
      )
      return { user: safe(updated!) }
    })
  },

  async resetPassword(
    societyId: string,
    id: string,
  ): Promise<TemporaryCredentialResponse> {
    assertUserId(id)
    const temporaryPassword = generateTemporaryPassword()
    const updated = await UserModel.findOneAndUpdate(
      { _id: id, societyId },
      {
        $set: {
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
        },
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after', runValidators: true },
    ).select('+passwordHash +tokenVersion')
    if (!updated) throw notFound()
    return credential(updated, temporaryPassword)
  },

  async updateSelf(
    societyId: string,
    userId: string,
    input: { name: string; phone: string },
  ) {
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, societyId },
      { $set: input },
      { returnDocument: 'after', runValidators: true },
    )
    if (!updated) throw notFound()
    return { user: safe(updated) }
  },
}
