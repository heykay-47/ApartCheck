import request from 'supertest'
import type { Options } from 'pino-http'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { createUserFixture } from '../helpers/factories.js'

const { logs } = vi.hoisted(() => ({ logs: [] as string[] }))

vi.mock('pino-http', async (importOriginal) => {
  const original = await importOriginal<typeof import('pino-http')>()
  const { Writable } = await import('node:stream')
  return {
    ...original,
    pinoHttp: (options: Options) =>
      original.pinoHttp(
        options,
        new Writable({
          write(chunk, _encoding, callback) {
            logs.push(String(chunk))
            callback()
          },
        }),
      ),
  }
})

describe('HTTP log redaction', () => {
  it('does not log session cookies issued by login', async () => {
    logs.length = 0
    const user = await createUserFixture({ mustChangePassword: false })
    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'apartcheck-test-password' })

    expect(response.status).toBe(200)
    const cookie = response.headers['set-cookie']?.[0]?.split(';')[0]
    expect(Boolean(cookie)).toBe(true)
    const entries = logs.map((line) => JSON.parse(line))
    const login = entries.find((entry) => entry.req?.url === '/api/auth/login')
    expect(Boolean(login)).toBe(true)
    expect(logs.some((line) => cookie && line.includes(cookie))).toBe(false)
    expect(login.res.headers['set-cookie']).toBe('[Redacted]')
  })
})
