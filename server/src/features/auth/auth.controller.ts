import type { RequestHandler } from 'express'
import { bootstrapSchema } from './auth.schema.js'
import { bootstrap, getBootstrapStatus } from './auth.service.js'
import { setSessionCookie, signSession } from './session.js'

export const bootstrapStatus: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    response.json(await getBootstrapStatus())
  } catch (error) {
    next(error)
  }
}

export const createBootstrap: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const input = bootstrapSchema.parse(request.body)
    const result = await bootstrap(input)
    const token = signSession({
      sub: result.userId,
      societyId: result.societyId,
      tokenVersion: 0,
    })
    setSessionCookie(response, token)
    response.status(201).json({ society: result.society, user: result.user })
  } catch (error) {
    next(error)
  }
}
