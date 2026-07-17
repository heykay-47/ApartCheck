import type { RequestHandler } from 'express'
import type { UserRole } from '../features/users/user.model.js'
import { AppError } from './app-error.js'

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.actor || !roles.includes(request.actor.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission.'))
      return
    }
    next()
  }
}
