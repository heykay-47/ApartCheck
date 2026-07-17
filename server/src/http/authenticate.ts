import type { RequestHandler } from 'express'
import { AppError } from './app-error.js'
import {
  getSessionCookieName,
  verifySession,
} from '../features/auth/session.js'
import { UserModel } from '../features/users/user.model.js'

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const token = request.cookies?.[getSessionCookieName()]
  if (!token) {
    next(
      new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'),
    )
    return
  }

  try {
    const payload = verifySession(token)
    const user = await UserModel.findOne({
      _id: payload.sub,
      societyId: payload.societyId,
      active: true,
    }).select('+tokenVersion')

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new AppError(401, 'INVALID_SESSION', 'Invalid session.')
    }

    request.actor = {
      userId: user.id,
      societyId: user.societyId.toString(),
      tokenVersion: user.tokenVersion,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      name: user.name,
      email: user.email,
      phone: user.phone,
      unitId: user.unitId?.toString() ?? null,
    }
    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, 'INVALID_SESSION', 'Invalid session.'),
    )
  }
}
