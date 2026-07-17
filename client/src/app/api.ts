import { queryClient } from './query-client'

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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  })
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => null)) as
    | {
        error?: {
          code?: string
          message?: string
          fieldErrors?: Record<string, string[]>
          requestId?: string
        }
      }
    | T
    | null
  if (!response.ok) {
    const error = (
      body as {
        error?: {
          code?: string
          message?: string
          fieldErrors?: Record<string, string[]>
          requestId?: string
        }
      } | null
    )?.error
    if (response.status === 401)
      void queryClient.invalidateQueries({ queryKey: ['current-user'] })
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'Request failed.',
      error?.fieldErrors ?? {},
      error?.requestId,
    )
  }
  return body as T
}
