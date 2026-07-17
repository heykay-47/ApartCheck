import type { RequestHandler } from 'express'
import { societyUpdateSchema } from './society.schema.js'
import { SocietyService } from './society.service.js'

export const getCurrentSociety: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json(await SocietyService.getCurrent(request.actor.societyId))
  } catch (error) {
    next(error)
  }
}

export const updateCurrentSociety: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const input = societyUpdateSchema.parse(request.body)
    response.json(
      await SocietyService.updateCurrent(request.actor.societyId, input),
    )
  } catch (error) {
    next(error)
  }
}
