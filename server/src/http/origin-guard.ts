import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'
import { env } from '../config/env.js'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const originGuard: RequestHandler = (request, response, next) => {
  if (
    !unsafeMethods.has(request.method) ||
    (request.path !== '/api' && !request.path.startsWith('/api/'))
  ) {
    next()
    return
  }

  const origin = request.get('Origin')
  if (!origin || origin === env.APP_BASE_URL) {
    next()
    return
  }

  response.status(403).json({
    error: {
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'Request origin is not allowed.',
      requestId: request.id ?? randomUUID(),
    },
  })
}
