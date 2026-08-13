import { clearSessionCaches, queryClient } from './query-client'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let sessionGeneration = 0
const requests = new Set<{
  controller: AbortController
  ignoreSessionBoundary: boolean
}>()

function staleSessionError() {
  return new DOMException('Session changed.', 'AbortError')
}

export function getSessionGeneration() {
  return sessionGeneration
}

export async function advanceSession() {
  sessionGeneration += 1
  for (const request of requests) {
    if (!request.ignoreSessionBoundary) request.controller.abort()
  }
  await clearSessionCaches()
}

type SessionRequestOptions = {
  ignoreSessionBoundary?: boolean
}

export async function sessionRequest<T>(
  path: string,
  init: RequestInit = {},
  consumeResponse: (response: Response) => Promise<T>,
  options: SessionRequestOptions = {},
): Promise<T> {
  const generation = sessionGeneration
  const controller = new AbortController()
  const request = {
    controller,
    ignoreSessionBoundary: options.ignoreSessionBoundary ?? false,
  }
  const callerSignal = init.signal
  const abort = () => controller.abort()
  if (callerSignal?.aborted) controller.abort()
  else callerSignal?.addEventListener('abort', abort, { once: true })
  requests.add(request)
  try {
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json')
    const response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers,
      signal: controller.signal,
    })
    const body = await consumeResponse(response)
    if (!request.ignoreSessionBoundary && generation !== sessionGeneration)
      throw staleSessionError()
    return body
  } finally {
    requests.delete(request)
    callerSignal?.removeEventListener('abort', abort)
  }
}

type ErrorBody = {
  error?: {
    code?: string
    message?: string
    fieldErrors?: Record<string, string[]>
    requestId?: string
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  options: SessionRequestOptions = {},
): Promise<T> {
  return sessionRequest(
    path,
    init,
    async (response) => {
      if (response.status === 204) return undefined as T
      const body = (await response.json().catch(() => null)) as
        ErrorBody | T | null
      if (!response.ok) {
        const error = (body as ErrorBody | null)?.error
        if (response.status === 401) {
          await advanceSession()
          queryClient.setQueryData(['current-user'], { user: undefined })
        }
        throw new ApiError(
          response.status,
          error?.code ?? 'REQUEST_FAILED',
          error?.message ?? 'Request failed.',
          error?.fieldErrors ?? {},
          error?.requestId,
        )
      }
      return body as T
    },
    options,
  )
}
