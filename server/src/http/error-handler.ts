import type { ErrorRequestHandler } from 'express'
import { AppError } from './app-error.js'

type MongoError = Error & { code?: number }
type ZodLikeError = Error & { name: string; issues?: unknown }

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  void _next
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = new AppError(
      400,
      'INVALID_JSON',
      'Request body contains invalid JSON.',
    )
  } else if ((error as ZodLikeError)?.name === 'ZodError') {
    appError = new AppError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed.',
      (error as ZodLikeError).issues,
    )
  } else if ((error as MongoError)?.code === 11000) {
    appError = new AppError(
      409,
      'DUPLICATE_RESOURCE',
      'Resource already exists.',
    )
  } else {
    appError = new AppError(
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred.',
    )
  }

  const body: { error: Record<string, unknown> } = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: request.id,
    },
  }
  if (appError.fieldErrors !== undefined) {
    body.error.fieldErrors = appError.fieldErrors
  }

  response.status(appError.status).json(body)
}
