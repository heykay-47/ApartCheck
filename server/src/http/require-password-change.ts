import type { RequestHandler } from 'express'
import { AppError } from './app-error.js'

export const requirePasswordChanged: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (request.actor?.mustChangePassword) {
    next(
      new AppError(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Password change required.',
      ),
    )
    return
  }
  next()
}
