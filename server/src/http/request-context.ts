import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

const requestIdPattern = /^[a-zA-Z0-9._:-]{1,128}$/

export const requestContext: RequestHandler = (request, response, next) => {
  const incomingId = request.get('X-Request-Id')
  request.id =
    incomingId && requestIdPattern.test(incomingId) ? incomingId : randomUUID()
  response.setHeader('X-Request-Id', request.id)
  next()
}
