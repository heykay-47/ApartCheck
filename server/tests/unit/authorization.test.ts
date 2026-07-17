import type { Request, Response, NextFunction } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { authenticate } from '../../src/http/authenticate.js'
import { authorize } from '../../src/http/authorize.js'

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

describe('authorization middleware', () => {
  it('allows admin and rejects resident and technician for admin policy', () => {
    const next = vi.fn() as NextFunction
    const policy = authorize('admin')

    for (const role of ['resident', 'technician'] as const) {
      const res = response()
      policy({ actor: { role } } as unknown as Request, res, next)
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, code: 'FORBIDDEN' }),
      )
    }

    const adminNext = vi.fn() as NextFunction
    policy(
      { actor: { role: 'admin' } } as unknown as Request,
      response(),
      adminNext,
    )
    expect(adminNext).toHaveBeenCalledOnce()
  })

  it('requires authentication before role policy runs', () => {
    const next = vi.fn() as NextFunction
    const res = response()

    void authenticate({ cookies: {} } as unknown as Request, res, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    )
  })
})
