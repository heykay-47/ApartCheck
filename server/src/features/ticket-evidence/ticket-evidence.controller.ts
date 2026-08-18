import type { RequestHandler } from 'express'
import type { TicketEvidenceService } from './ticket-evidence.service.js'

function param(request: Parameters<RequestHandler>[0], key: string): string {
  const value = request.params[key]
  return typeof value === 'string' ? value : ''
}

export function createTicketEvidenceController(service: TicketEvidenceService) {
  const upload: RequestHandler = async (request, response, next) => {
    try {
      const files = (request.files ?? []) as Express.Multer.File[]
      response.status(201).json({
        evidence: await service.upload(
          request.actor,
          param(request, 'id'),
          files.map((file) => file.buffer),
        ),
      })
    } catch (error) {
      next(error)
    }
  }

  const remove: RequestHandler = async (request, response, next) => {
    try {
      await service.remove(
        request.actor,
        param(request, 'id'),
        param(request, 'evidenceId'),
      )
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  const view: RequestHandler = async (request, response, next) => {
    try {
      response.json(
        await service.view(
          request.actor,
          param(request, 'id'),
          param(request, 'evidenceId'),
        ),
      )
    } catch (error) {
      next(error)
    }
  }

  return { upload, remove, view }
}
