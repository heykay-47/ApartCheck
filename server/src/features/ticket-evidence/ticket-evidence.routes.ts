import { Router } from 'express'
import multer, { MulterError } from 'multer'
import { authorize } from '../../http/authorize.js'
import { AppError } from '../../http/app-error.js'
import { MAX_PHOTO_BYTES, MAX_TOTAL_PHOTO_BYTES } from './image-validation.js'
import { createTicketEvidenceController } from './ticket-evidence.controller.js'
import { createTicketEvidenceService } from './ticket-evidence.service.js'
import type { ImageStorage } from '../../storage/image-storage.js'

const multipart = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 5,
    fields: 0,
  },
})

function multipartError(error: unknown) {
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE')
      return new AppError(413, 'EVIDENCE_LIMIT_EXCEEDED', 'Photo exceeds 8 MiB')
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_PART_COUNT')
      return new AppError(
        413,
        'EVIDENCE_LIMIT_EXCEEDED',
        'Add no more than five photos.',
      )
    return new AppError(
      400,
      'EVIDENCE_INVALID_MULTIPART',
      'Multipart request contains an unsupported field.',
    )
  }
  return new AppError(
    400,
    'EVIDENCE_INVALID_MULTIPART',
    'Multipart request could not be read.',
  )
}

export function createTicketEvidenceRoutes(storage: ImageStorage) {
  const service = createTicketEvidenceService(storage)
  const controller = createTicketEvidenceController(service)
  const routes = Router()

  routes.post(
    '/:id/evidence',
    authorize('technician'),
    (request, response, next) => {
      multipart.array('photos', 5)(request, response, (error: unknown) => {
        if (error) {
          next(multipartError(error))
          return
        }
        const files = (request.files ?? []) as Express.Multer.File[]
        const totalBytes = files.reduce((total, file) => total + file.size, 0)
        if (totalBytes > MAX_TOTAL_PHOTO_BYTES) {
          next(
            new AppError(
              413,
              'EVIDENCE_LIMIT_EXCEEDED',
              'Photos exceed 40 MiB.',
            ),
          )
          return
        }
        if (files.length === 0) {
          next(
            new AppError(
              400,
              'EVIDENCE_PHOTOS_REQUIRED',
              'Add at least one photo.',
            ),
          )
          return
        }
        controller.upload(request, response, next)
      })
    },
  )
  routes.delete(
    '/:id/evidence/:evidenceId',
    authorize('technician'),
    controller.remove,
  )
  routes.get('/:id/evidence/:evidenceId/view', controller.view)
  return routes
}
