import mongoose from 'mongoose'
import { AppError } from '../../http/app-error.js'
import { SocietyModel } from '../societies/society.model.js'
import { UserModel } from '../users/user.model.js'
import { hashPassword } from './password.js'
import type { BootstrapInput } from './auth.schema.js'

function isSocietySingletonDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000 &&
    'keyPattern' in error &&
    typeof error.keyPattern === 'object' &&
    error.keyPattern !== null &&
    'singletonKey' in error.keyPattern
  )
}

export async function getBootstrapStatus(): Promise<{ initialized: boolean }> {
  const initialized =
    (await SocietyModel.exists({ singletonKey: 'primary' })) !== null
  return { initialized }
}

export async function bootstrap(input: BootstrapInput) {
  try {
    return await mongoose.connection.transaction(async (session) => {
      const society = await SocietyModel.create(
        [
          {
            name: input.society.name,
            address: input.society.address,
            singletonKey: 'primary',
          },
        ],
        { session },
      ).then(([created]) => created)
      if (!society) throw new Error('Society creation returned no document.')
      const passwordHash = await hashPassword(input.admin.password)
      const user = await UserModel.create(
        [
          {
            name: input.admin.name,
            email: input.admin.email,
            phone: input.admin.phone,
            passwordHash,
            role: 'admin',
            societyId: society._id,
            unitId: null,
            mustChangePassword: false,
            tokenVersion: 0,
            active: true,
          },
        ],
        { session },
      ).then(([created]) => created)
      if (!user) throw new Error('User creation returned no document.')

      return {
        society: society.toJSON(),
        user: user.toJSON(),
        userId: user.id,
        societyId: society.id,
      }
    })
  } catch (error) {
    if (isSocietySingletonDuplicate(error)) {
      throw new AppError(
        409,
        'BOOTSTRAP_COMPLETE',
        'Bootstrap has already been completed.',
      )
    }
    throw error
  }
}
