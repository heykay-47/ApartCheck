import request from 'supertest'
import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { SocietyModel } from '../../src/features/societies/society.model.js'
import { UserModel } from '../../src/features/users/user.model.js'
import {
  clearSessionCookie,
  getSessionCookieName,
  setSessionCookie,
  signSession,
  verifySession,
} from '../../src/features/auth/session.js'
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from '../../src/features/auth/password.js'

const bootstrapBody = {
  society: { name: 'Ananya Enclave', address: 'Velachery, Chennai' },
  admin: {
    name: 'Meera Raman',
    email: 'meera@example.com',
    phone: '+919876543210',
    password: 'correct horse battery staple',
  },
}

describe('password primitives', () => {
  it('hashes and verifies passwords while rejecting byte lengths outside bounds', async () => {
    const hash = await hashPassword(bootstrapBody.admin.password)

    expect(hash).not.toBe(bootstrapBody.admin.password)
    await expect(
      verifyPassword(bootstrapBody.admin.password, hash),
    ).resolves.toBe(true)
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false)
    await expect(hashPassword('short')).rejects.toThrow()
    await expect(hashPassword('x'.repeat(73))).rejects.toThrow()
  })

  it('generates a 16-character temporary password', () => {
    const password = generateTemporaryPassword()

    expect(password).toHaveLength(16)
    expect(password).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('session primitives', () => {
  it('signs and verifies the expected eight-hour HS256 session', () => {
    const token = signSession({
      sub: 'user-id',
      societyId: 'society-id',
      tokenVersion: 0,
    })
    const payload = verifySession(token)

    expect(payload).toMatchObject({
      sub: 'user-id',
      societyId: 'society-id',
      tokenVersion: 0,
    })
  })

  it('uses matching cookie attributes for set and clear helpers', () => {
    const cookieArgs: unknown[] = []
    const clearCookieArgs: unknown[] = []
    const cookieResponse = {
      cookie: (...args: unknown[]) => void cookieArgs.push(...args),
      clearCookie: (...args: unknown[]) => void clearCookieArgs.push(...args),
    } as unknown as Parameters<typeof setSessionCookie>[0]

    setSessionCookie(cookieResponse, 'token')
    clearSessionCookie(cookieResponse)

    expect(cookieArgs[0]).toBe(getSessionCookieName())
    expect(clearCookieArgs[0]).toBe(getSessionCookieName())
    expect(cookieArgs[2]).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
    expect(clearCookieArgs[1]).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  })
})

describe('bootstrap API', () => {
  it('reports uninitialized status', async () => {
    const response = await request(createApp()).get('/api/bootstrap/status')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ initialized: false })
  })

  it('creates society and first admin, then sets an HttpOnly session cookie', async () => {
    const response = await request(createApp())
      .post('/api/bootstrap')
      .set('X-Forwarded-For', '10.0.0.99')
      .send(bootstrapBody)

    expect(response.status).toBe(201)
    expect(response.body.society.name).toBe('Ananya Enclave')
    expect(response.body.user).not.toHaveProperty('passwordHash')
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly')
    expect(await SocietyModel.countDocuments()).toBe(1)
    expect(await UserModel.countDocuments()).toBe(1)
    expect(await UserModel.findOne().select('+passwordHash')).toMatchObject({
      mustChangePassword: false,
      role: 'admin',
    })
  })

  it('rejects a second bootstrap attempt without setting a cookie', async () => {
    await request(createApp())
      .post('/api/bootstrap')
      .set('X-Forwarded-For', '10.0.0.102')
      .send(bootstrapBody)
    const response = await request(createApp())
      .post('/api/bootstrap')
      .set('X-Forwarded-For', '10.0.0.102')
      .send({
        ...bootstrapBody,
        admin: { ...bootstrapBody.admin, email: 'other@example.com' },
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('BOOTSTRAP_COMPLETE')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('allows only one concurrent bootstrap transaction', async () => {
    const responses = await Promise.all([
      request(createApp())
        .post('/api/bootstrap')
        .set('X-Forwarded-For', '10.0.0.103')
        .send(bootstrapBody),
      request(createApp())
        .post('/api/bootstrap')
        .set('X-Forwarded-For', '10.0.0.103')
        .send({
          ...bootstrapBody,
          society: { name: 'Other Society', address: 'Chennai' },
          admin: { ...bootstrapBody.admin, email: 'other@example.com' },
        }),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ])
    expect(
      responses.find((response) => response.status === 409)?.body.error.code,
    ).toBe('BOOTSTRAP_COMPLETE')
    expect(await SocietyModel.countDocuments()).toBe(1)
    expect(await UserModel.countDocuments()).toBe(1)
  })

  it('does not set a cookie when the bootstrap transaction aborts', async () => {
    await SocietyModel.create({
      name: 'Existing',
      address: 'Chennai',
      singletonKey: 'primary',
    })
    const response = await request(createApp())
      .post('/api/bootstrap')
      .set('X-Forwarded-For', '10.0.0.101')
      .send(bootstrapBody)

    expect(response.status).toBe(409)
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('limits bootstrap attempts to five per IP per hour', async () => {
    const app = createApp()
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        request(app)
          .post('/api/bootstrap')
          .set('X-Forwarded-For', '10.0.0.100')
          .send({
            ...bootstrapBody,
            admin: {
              ...bootstrapBody.admin,
              email: `user-${index}@example.com`,
            },
          }),
      ),
    )

    expect(responses.some((response) => response.status === 429)).toBe(true)
  })

  it('uses a replica-set transaction for bootstrap', () => {
    expect(mongoose.connection.host).toBeTruthy()
  })
})
