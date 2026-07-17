import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /api/health/live', () => {
  it('reports process liveness', async () => {
    const response = await request(createApp()).get('/api/health/live')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
