export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: unknown
  readonly isOperational = true

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
