import type { RequestHandler } from 'express'
import { AppError } from './app-error.js'

export const apiNotFound: RequestHandler = (request, _response, next) => {
  if (request.path === '/api' || request.path.startsWith('/api/')) {
    next(new AppError(404, 'ROUTE_NOT_FOUND', 'API route not found.'))
    return
  }
  next()
}
