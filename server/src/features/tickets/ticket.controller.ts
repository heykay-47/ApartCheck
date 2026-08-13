import type { RequestHandler } from 'express'
import {
  assetTicketListSchema,
  eligibleTechnicianSchema,
  ticketAssignmentSchema,
  ticketCancelSchema,
  ticketCreateSchema,
  ticketListSchema,
  ticketReopenSchema,
  ticketStartWorkSchema,
  ticketReturnSchema,
  ticketSubmitSchema,
} from './ticket.schema.js'
import { TicketService } from './ticket.service.js'

function param(request: Parameters<RequestHandler>[0], key: string): string {
  const value = request.params[key]
  return typeof value === 'string' ? value : ''
}

export const listTickets: RequestHandler = async (request, response, next) => {
  try {
    response.json(
      await TicketService.list(
        request.actor,
        ticketListSchema.parse(request.query),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const createTicket: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      ticket: await TicketService.create(
        request.actor,
        ticketCreateSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const getTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.get(request.actor, param(request, 'id')),
    })
  } catch (error) {
    next(error)
  }
}

export const eligibleTechnicians: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json(
      await TicketService.eligibleTechnicians(
        request.actor,
        eligibleTechnicianSchema.parse(request.query),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const listAssetTickets: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json(
      await TicketService.listActiveForAsset(
        request.actor,
        param(request, 'assetId'),
        assetTicketListSchema.parse(request.query),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const assignTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.assign(
        request.actor,
        param(request, 'id'),
        ticketAssignmentSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const startTicketWork: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    ticketStartWorkSchema.parse(request.body)
    response.json({
      ticket: await TicketService.startWork(
        request.actor,
        param(request, 'id'),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const submitTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.submitForVerification(
        request.actor,
        param(request, 'id'),
        ticketSubmitSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const returnTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.returnForRework(
        request.actor,
        param(request, 'id'),
        ticketReturnSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const verifyTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.verify(request.actor, param(request, 'id')),
    })
  } catch (error) {
    next(error)
  }
}

export const reopenTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.reopen(
        request.actor,
        param(request, 'id'),
        ticketReopenSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const cancelTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      ticket: await TicketService.cancel(
        request.actor,
        param(request, 'id'),
        ticketCancelSchema.parse(request.body),
      ),
    })
  } catch (error) {
    next(error)
  }
}

export const archiveTicket: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    await TicketService.archive(request.actor, param(request, 'id'))
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}
