import type { RequestHandler } from 'express'
import {
  unitCreateSchema,
  unitListSchema,
  unitUpdateSchema,
} from './unit.schema.js'
import { UnitService } from './unit.service.js'

function unitId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.id
  return typeof value === 'string' ? value : ''
}

export const listUnits: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await UnitService.list(
        request.actor.societyId,
        unitListSchema.parse(request.query),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const getMyUnit: RequestHandler = async (request, response, next) => {
  try {
    response.json({ unit: await UnitService.getMyUnit(request.actor) })
  } catch (error) {
    next(error)
  }
}

export const createUnit: RequestHandler = async (request, response, next) => {
  try {
    const unit = await UnitService.create(
      request.actor.societyId,
      unitCreateSchema.parse(request.body),
    )
    response.status(201).json({ unit })
  } catch (error) {
    next(error)
  }
}

export const getUnit: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      unit: await UnitService.get(request.actor.societyId, unitId(request)),
    })
  } catch (error) {
    next(error)
  }
}

export const updateUnit: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      unit: await UnitService.update(
        request.actor.societyId,
        unitId(request),
        unitUpdateSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const archiveUnit: RequestHandler = async (request, response, next) => {
  try {
    await UnitService.archive(request.actor.societyId, unitId(request))
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}
