import { describe, expect, it, vi } from 'vitest'
import { originGuard } from '../src/http/origin-guard.js'

function makeRequest(origin: string | undefined, method = 'POST') {
  return {
    method,
    path: '/api/example',
    get: vi.fn((name: string) =>
      name.toLowerCase() === 'origin' ? origin : undefined,
    ),
  }
}

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response
}

describe('originGuard', () => {
  it('rejects unsafe API requests from another origin', () => {
    const request = makeRequest('https://evil.example')
    const response = makeResponse()
    const next = vi.fn()

    originGuard(request as never, response as never, next)

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed.',
        requestId: expect.any(String),
      },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows the configured application origin', () => {
    const next = vi.fn()

    originGuard(
      makeRequest('http://localhost:5173') as never,
      makeResponse() as never,
      next,
    )

    expect(next).toHaveBeenCalledOnce()
  })

  it('allows requests without an origin', () => {
    const next = vi.fn()

    originGuard(makeRequest(undefined) as never, makeResponse() as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
