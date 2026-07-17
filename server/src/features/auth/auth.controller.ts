import type { RequestHandler } from 'express'
import {
  bootstrapSchema,
  changePasswordSchema,
  loginSchema,
} from './auth.schema.js'
import {
  bootstrap,
  changeOwnPassword,
  getBootstrapStatus,
  login,
} from './auth.service.js'
import { clearSessionCookie, setSessionCookie, signSession } from './session.js'
import { serializePublicUser } from '../users/user.dto.js'

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
    response.status(201).json({
      society: result.society,
      user: serializePublicUser(result.user),
    })
  } catch (error) {
    next(error)
  }
}

export const createLogin: RequestHandler = async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body)
    const user = await login(input.email, input.password)
    setSessionCookie(
      response,
      signSession({
        sub: user.id,
        societyId: user.societyId.toString(),
        tokenVersion: user.tokenVersion,
      }),
    )
    response.json({ user: serializePublicUser(user) })
  } catch (error) {
    next(error)
  }
}

export const logout: RequestHandler = (_request, response) => {
  clearSessionCookie(response)
  response.status(204).send()
}

export const currentSession: RequestHandler = (request, response) => {
  response.json({
    user: serializePublicUser({
      ...request.actor,
      id: request.actor.userId,
    }),
  })
}

export const changePassword: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const input = changePasswordSchema.parse(request.body)
    const user = await changeOwnPassword(
      request.actor.userId,
      input.currentPassword,
      input.newPassword,
    )
    setSessionCookie(
      response,
      signSession({
        sub: user.id,
        societyId: user.societyId.toString(),
        tokenVersion: user.tokenVersion,
      }),
    )
    response.json({ user: serializePublicUser(user) })
  } catch (error) {
    next(error)
  }
}
