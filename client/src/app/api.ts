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
const sessionGenerationListeners = new Set<() => void>()
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

export function subscribeSessionGeneration(listener: () => void): () => void {
  sessionGenerationListeners.add(listener)
  return () => {
    sessionGenerationListeners.delete(listener)
  }
}

export async function advanceSession(options: { clearCaches?: boolean } = {}) {
  sessionGeneration += 1
  for (const listener of [...sessionGenerationListeners]) listener()
  for (const request of requests) {
    if (!request.ignoreSessionBoundary) request.controller.abort()
  }
  if (options.clearCaches !== false) await clearSessionCaches()
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
    if (!headers.has('Content-Type') && !(init.body instanceof FormData))
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

async function throwApiError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null
  const error = body?.error
  if (response.status === 401) {
    queryClient.setQueryData(['current-user'], { user: undefined })
    await advanceSession({ clearCaches: false })
  }
  throw new ApiError(
    response.status,
    error?.code ?? 'REQUEST_FAILED',
    error?.message ?? 'Request failed.',
    error?.fieldErrors ?? {},
    error?.requestId,
  )
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
      if (!response.ok) await throwApiError(response)
      const body = await response.json().catch(() => null)
      return body as T
    },
    options,
  )
}

export async function apiBlob(
  path: string,
  init: RequestInit = {},
  options: SessionRequestOptions = {},
): Promise<Blob> {
  return sessionRequest(
    path,
    init,
    async (response) => {
      if (!response.ok) await throwApiError(response)
      return response.blob()
    },
    options,
  )
}
