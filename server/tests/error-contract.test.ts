import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('API error contract', () => {
  it('returns a canonical not-found error with request ID', async () => {
    const response = await request(createApp()).get('/api/missing')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'API route not found.',
        requestId: expect.any(String),
      },
    })
  })

  it('returns a canonical error for malformed JSON', async () => {
    const response = await request(createApp())
      .post('/api/echo')
      .set('Content-Type', 'application/json')
      .send('{')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON.',
        requestId: expect.any(String),
      },
    })
  })

  it('indexes Zod issues by field while preserving canonical validation shape', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        requestId: expect.any(String),
        fieldErrors: { email: expect.arrayContaining([expect.any(String)]) },
      },
    })
  })

  it('returns database unavailable until mongoose is connected', async () => {
    const response = await request(createApp()).get('/api/health/ready')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is unavailable.',
        requestId: expect.any(String),
      },
    })
  })

  it('preserves a valid incoming request ID', async () => {
    const response = await request(createApp())
      .get('/api/missing')
      .set('X-Request-Id', 'request-123')

    expect(response.body.error.requestId).toBe('request-123')
  })
})
