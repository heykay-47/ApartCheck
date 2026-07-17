import { describe, expect, it, vi } from 'vitest'
import { apiNotFound } from '../src/http/not-found.js'

describe('apiNotFound', () => {
  it.each(['/apiary', '/apix'])('ignores non-API path %s', (path) => {
    const next = vi.fn()

    apiNotFound({ path } as never, {} as never, next)

    expect(next).toHaveBeenCalledWith()
  })
})
