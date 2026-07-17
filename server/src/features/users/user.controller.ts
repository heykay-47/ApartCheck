import type { RequestHandler } from 'express'
import {
  userCreateSchema,
  userListSchema,
  userSelfUpdateSchema,
  userStatusSchema,
  userUpdateSchema,
} from './user.schema.js'
import { UserService } from './user.service.js'

const id = (request: Parameters<RequestHandler>[0]) =>
  typeof request.params.id === 'string' ? request.params.id : ''

export const listUsers: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await UserService.list(
        request.actor.societyId,
        userListSchema.parse(request.query),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const createUser: RequestHandler = async (request, response, next) => {
  try {
    response
      .status(201)
      .json(
        await UserService.create(
          request.actor.societyId,
          userCreateSchema.parse(request.body),
        ),
      )
  } catch (error) {
    next(error)
  }
}

export const updateUser: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await UserService.update(
        request.actor.societyId,
        id(request),
        userUpdateSchema.parse(request.body),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const setUserStatus: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json(
      await UserService.setStatus(
        request.actor.societyId,
        id(request),
        userStatusSchema.parse(request.body).active,
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const resetUserPassword: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json(
      await UserService.resetPassword(request.actor.societyId, id(request)),
    )
  } catch (error) {
    next(error)
  }
}

export const updateSelf: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await UserService.updateSelf(
        request.actor.societyId,
        request.actor.userId,
        userSelfUpdateSchema.parse(request.body),
      ),
    )
  } catch (error) {
    next(error)
  }
}
