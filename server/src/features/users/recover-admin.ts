import { AppError } from '../../http/app-error.js'
import { generateTemporaryPassword, hashPassword } from '../auth/password.js'
import { UserModel } from './user.model.js'
import {
  serializeSafeUser,
  type TemporaryCredentialResponse,
} from './user.dto.js'

export async function recoverAdmin(
  email: string,
): Promise<TemporaryCredentialResponse> {
  const normalizedEmail = email.trim().toLowerCase()
  const temporaryPassword = generateTemporaryPassword()
  const user = await UserModel.findOneAndUpdate(
    { email: normalizedEmail, role: 'admin' },
    {
      $set: {
        active: true,
        mustChangePassword: true,
        passwordHash: await hashPassword(temporaryPassword),
      },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: 'after', runValidators: true },
  ).select('+passwordHash +tokenVersion')
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Admin not found.')
  return { user: serializeSafeUser(user), temporaryPassword }
}
